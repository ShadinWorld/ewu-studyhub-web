-- EWU StudyHub — transparency activity timeline and admin-only homepage control reads

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  event_type text not null,
  title text not null,
  body text,
  actor_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_events_profile_created on public.activity_events(profile_id, created_at desc);
create index if not exists idx_activity_events_entity_created on public.activity_events(entity_type, entity_id, created_at asc);

alter table public.activity_events enable row level security;
drop policy if exists "activity events own read" on public.activity_events;
create policy "activity events own read" on public.activity_events for select using (profile_id = auth.uid() or is_admin());
drop policy if exists "activity events no client insert" on public.activity_events;
create policy "activity events no client insert" on public.activity_events for insert with check (false);

create or replace function public.record_activity_event(
  p_profile_id uuid, p_entity_type text, p_entity_id uuid, p_event_type text,
  p_title text, p_body text default null, p_actor_id uuid default null, p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_events(profile_id, entity_type, entity_id, event_type, title, body, actor_id, metadata)
  values (p_profile_id, p_entity_type, p_entity_id, p_event_type, p_title, p_body, p_actor_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

revoke all on function public.record_activity_event(uuid,text,uuid,text,text,text,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.record_activity_event(uuid,text,uuid,text,text,text,uuid,jsonb) to service_role;

-- Purchases: buyer and seller both get a neutral, traceable timeline.
create or replace function public.activity_event_purchase() returns trigger
language plpgsql security definer set search_path=public as $$
declare seller uuid; title text; label text;
begin
  select f.seller_id, f.title into seller, title from public.files f where f.id = new.file_id;
  label := case new.status when 'pending' then 'Purchase request submitted' when 'completed' then 'Purchase completed' when 'failed' then 'Purchase rejected' when 'refunded' then 'Purchase refunded' else 'Purchase updated' end;
  perform public.record_activity_event(new.buyer_id,'purchase'::text,new.id,new.status::text,label::text,coalesce(title,'Resource purchase')::text,new.approved_by,jsonb_build_object('invoice_number',new.invoice_number,'amount_cents',new.amount_cents));
  if seller is not null then
    perform public.record_activity_event(seller,'purchase'::text,new.id,new.status::text,label::text,coalesce(title,'Resource purchase')::text,new.approved_by,jsonb_build_object('invoice_number',new.invoice_number,'amount_cents',new.amount_cents));
  end if;
  return new;
end; $$;

drop trigger if exists trg_activity_purchase on public.purchases;
create trigger trg_activity_purchase after insert or update of status, approved_at, rejection_reason on public.purchases for each row execute function public.activity_event_purchase();

-- Payouts: seller-facing transparency.
create or replace function public.activity_event_payout() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  perform public.record_activity_event(new.seller_id,'payout',new.id,new.status,case new.status when 'pending' then 'Payout request submitted' when 'processing' then 'Payout is processing' when 'completed' then 'Payout completed' when 'failed' then 'Payout rejected' else 'Payout updated' end,concat('Amount: ', round(new.amount_cents/100.0,2), ' BDT'),null,jsonb_build_object('amount_cents',new.amount_cents));
  return new;
end; $$;

drop trigger if exists trg_activity_payout on public.payouts;
create trigger trg_activity_payout after insert or update of status on public.payouts for each row execute function public.activity_event_payout();

-- Resources: seller timeline for upload and moderation state.
create or replace function public.activity_event_file() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  perform public.record_activity_event(new.seller_id,'resource',new.id,new.visibility,case new.visibility when 'draft' then 'Resource submitted for review' when 'published' then 'Resource approved and published' when 'rejected' then 'Resource rejected by admin' when 'archived' then 'Resource archived' else 'Resource updated' end,new.title,null,jsonb_build_object('rejection_reason',new.rejection_reason));
  return new;
end; $$;

drop trigger if exists trg_activity_file on public.files;
create trigger trg_activity_file after insert or update of visibility, rejection_reason on public.files for each row execute function public.activity_event_file();

-- Seller verification: the requester sees the status timeline.
create or replace function public.activity_event_profile_verification() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.student_id_verification_status is distinct from old.student_id_verification_status and new.student_id_verification_status in ('pending','verified','rejected') then
    perform public.record_activity_event(new.id,'seller_verification',new.id,new.student_id_verification_status,case new.student_id_verification_status when 'pending' then 'Seller verification submitted' when 'verified' then 'Seller verification approved' when 'rejected' then 'Seller verification rejected' else 'Seller verification updated' end,'Your seller verification status changed.',null,'{}'::jsonb);
  end if;
  return new;
end; $$;

drop trigger if exists trg_activity_profile_verification on public.profiles;
create trigger trg_activity_profile_verification after update of student_id_verification_status on public.profiles for each row execute function public.activity_event_profile_verification();

-- Student resource requests.
create or replace function public.activity_event_resource_request() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  perform public.record_activity_event(new.user_id,'resource_request',new.id,new.status,case when tg_op='INSERT' then 'Resource request submitted' else 'Resource request updated' end,new.title,null,'{}'::jsonb);
  return new;
end; $$;

drop trigger if exists trg_activity_resource_request on public.resource_requests;
create trigger trg_activity_resource_request after insert or update of status on public.resource_requests for each row execute function public.activity_event_resource_request();

-- Support tickets.
create or replace function public.activity_event_support_ticket() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  perform public.record_activity_event(new.user_id,'support',new.id,new.status,case when tg_op='INSERT' then 'Support request submitted' when new.status is distinct from old.status then 'Support request status updated' else 'Support request updated' end,coalesce(new.subject,'Support request'),null,jsonb_build_object('category',new.category));
  return new;
end; $$;

drop trigger if exists trg_activity_support_ticket on public.support_tickets;
create trigger trg_activity_support_ticket after insert or update of status, admin_reply on public.support_tickets for each row execute function public.activity_event_support_ticket();

-- These are admin-private configuration tables.
drop policy if exists "quick actions public read" on public.homepage_quick_actions;
create policy "quick actions admin read" on public.homepage_quick_actions for select using (is_admin());
drop policy if exists "homepage section settings public read" on public.homepage_section_settings;
create policy "homepage section settings admin read" on public.homepage_section_settings for select using (is_admin());
drop policy if exists "quick attention public read" on public.homepage_quick_attention;
create policy "quick attention admin read" on public.homepage_quick_attention for select using (is_admin());
