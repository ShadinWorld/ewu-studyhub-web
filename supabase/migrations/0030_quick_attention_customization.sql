-- EWU StudyHub — Admin Quick Attention customization

create table if not exists public.homepage_quick_attention (
  id uuid primary key default uuid_generate_v4(),
  audience text not null default 'admin' check (audience in ('admin')),
  title text not null,
  href text not null,
  icon text not null default 'BellRing',
  display_order integer not null default 1,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.homepage_quick_attention(audience,title,href,icon,display_order)
select 'admin', v.title, v.href, v.icon, v.display_order
from (values
  ('Pending resource approvals','/admin/pending?type=resources','Upload',1),
  ('Seller verification','/admin/pending?type=sellers','UserCheck',2),
  ('Payout requests','/admin/pending?type=payouts','WalletCards',3),
  ('Purchase reviews','/admin/pending?type=purchases','CreditCard',4),
  ('Resource requests','/admin/pending?type=resource_requests','ClipboardList',5),
  ('Open reports','/admin/pending?type=reports','Flag',6),
  ('Support tickets','/admin/pending?type=support','LifeBuoy',7),
  ('All pending work','/admin/pending','BellRing',8)
) as v(title,href,icon,display_order)
where not exists (select 1 from public.homepage_quick_attention q where q.audience='admin' and q.display_order=v.display_order);

alter table public.homepage_quick_attention enable row level security;
drop policy if exists "quick attention public read" on public.homepage_quick_attention;
create policy "quick attention public read" on public.homepage_quick_attention for select using(true);
drop policy if exists "admins manage quick attention" on public.homepage_quick_attention;
create policy "admins manage quick attention" on public.homepage_quick_attention for all using(is_admin()) with check(is_admin());
