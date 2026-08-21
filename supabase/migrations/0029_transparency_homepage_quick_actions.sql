-- EWU StudyHub — transparency, admin quick actions, pending work and response-time settings

create table if not exists public.platform_response_time_settings (
  category text primary key,
  estimated_hours integer not null default 6 check (estimated_hours between 1 and 168),
  updated_at timestamptz not null default now()
);
insert into public.platform_response_time_settings(category, estimated_hours) values
  ('default',6),('seller_verification',6),('resource_approval',6),('payout_request',6),('purchase_request',6),('report',6),('support',6),('payment',6)
on conflict(category) do nothing;

create table if not exists public.homepage_quick_actions (
  id uuid primary key default uuid_generate_v4(),
  audience text not null default 'admin' check (audience in ('student','seller','admin','all')),
  title text not null,
  icon text not null default 'LayoutDashboard',
  href text not null,
  display_order integer not null default 1,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.homepage_quick_actions(audience,title,icon,href,display_order)
select 'admin', v.title, v.icon, v.href, v.display_order
from (values
  ('Uploads','Upload','/admin/uploads',1),
  ('Sellers','Users','/admin/sellers',2),
  ('Payouts','WalletCards','/admin/payouts',3),
  ('Payments','CreditCard','/admin/payments',4),
  ('Reports','Flag','/admin/reports',5),
  ('Users','Users','/admin/users',6),
  ('Requests','ClipboardList','/admin/academic-tools',7),
  ('Support','LifeBuoy','/admin/support',8),
  ('Settings','Settings','/admin/settings',9)
) as v(title,icon,href,display_order)
where not exists (select 1 from public.homepage_quick_actions q where q.audience='admin' and q.display_order=v.display_order);

create table if not exists public.homepage_section_settings (
  audience text not null check (audience in ('student','seller','admin','all')),
  section_key text not null,
  display_order integer not null default 1,
  is_visible boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key(audience, section_key)
);

insert into public.homepage_section_settings(audience,section_key,display_order)
values
 ('all','banner',1),('all','quick_actions',2),('all','search',3),('all','recent_activity',4),('all','your_resources',5),('all','recently_viewed',6),('all','popular_resources',7),('all','popular_courses',8),('all','departments',9),('all','featured_resources',10)
on conflict do nothing;

alter table public.platform_response_time_settings enable row level security;
drop policy if exists "response time public read" on public.platform_response_time_settings;
create policy "response time public read" on public.platform_response_time_settings for select using(true);
drop policy if exists "admins manage response time" on public.platform_response_time_settings;
create policy "admins manage response time" on public.platform_response_time_settings for all using(is_admin()) with check(is_admin());

alter table public.homepage_quick_actions enable row level security;
drop policy if exists "quick actions public read" on public.homepage_quick_actions;
create policy "quick actions public read" on public.homepage_quick_actions for select using(true);
drop policy if exists "admins manage quick actions" on public.homepage_quick_actions;
create policy "admins manage quick actions" on public.homepage_quick_actions for all using(is_admin()) with check(is_admin());

alter table public.homepage_section_settings enable row level security;
drop policy if exists "homepage section settings public read" on public.homepage_section_settings;
create policy "homepage section settings public read" on public.homepage_section_settings for select using(true);
drop policy if exists "admins manage homepage section settings" on public.homepage_section_settings;
create policy "admins manage homepage section settings" on public.homepage_section_settings for all using(is_admin()) with check(is_admin());

-- Compact audit log events for sensitive admin decisions where the source tables already have actor columns.
-- The existing audit_logs table remains the source of truth; this migration only adds request SLA configuration.
