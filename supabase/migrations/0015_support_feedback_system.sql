-- EWU StudyHub — Support, feedback and business issue tracking

create table if not exists support_tickets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  category text not null check (category in (
    'suggestion', 'complaint', 'general', 'payment', 'resource', 'seller', 'account', 'purchase'
  )),
  subject text,
  message text not null check (char_length(trim(message)) >= 3),
  page_path text,
  status text not null default 'new' check (status in ('new', 'in_review', 'resolved')),
  admin_reply text,
  replied_by uuid references profiles(id),
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_status_created
  on support_tickets(status, created_at desc);
create index if not exists idx_support_tickets_user
  on support_tickets(user_id, created_at desc);
create index if not exists idx_support_tickets_category
  on support_tickets(category, created_at desc);

alter table support_tickets enable row level security;

create policy "users create own support tickets"
  on support_tickets for insert
  with check (user_id = auth.uid());

create policy "users see own support tickets"
  on support_tickets for select
  using (user_id = auth.uid() or is_admin());

create policy "admins manage support tickets"
  on support_tickets for update
  using (is_admin())
  with check (is_admin());

create or replace function touch_support_ticket_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_support_tickets_updated_at on support_tickets;
create trigger trg_support_tickets_updated_at
before update on support_tickets
for each row execute function touch_support_ticket_updated_at();

-- Admin replies are delivered through the existing notification system.
create or replace function notify_support_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.admin_reply is distinct from old.admin_reply and new.admin_reply is not null and length(trim(new.admin_reply)) > 0 then
    insert into notifications(profile_id, type, title, body, link)
    values (
      new.user_id,
      'report_update',
      'Admin replied to your support request',
      left(new.admin_reply, 500),
      '/support'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_support_reply_notification on support_tickets;
create trigger trg_support_reply_notification
after update on support_tickets
for each row execute function notify_support_reply();
