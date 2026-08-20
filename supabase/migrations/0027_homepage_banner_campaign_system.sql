-- EWU StudyHub — Homepage Banner / Campaign system

create table if not exists public.homepage_banner_settings (
  audience text primary key check (audience in ('all','student','seller','admin')),
  max_visible integer not null default 5 check (max_visible between 1 and 10),
  autoplay boolean not null default true,
  auto_rotate_seconds integer not null default 6 check (auto_rotate_seconds between 3 and 20),
  show_dots boolean not null default true,
  show_arrows boolean not null default true,
  transition text not null default 'fade_slide' check (transition in ('fade','slide','fade_slide')),
  updated_at timestamptz not null default now()
);
insert into public.homepage_banner_settings (audience) values ('all'),('student'),('seller'),('admin') on conflict (audience) do nothing;
alter table public.announcements
  add column if not exists audience text not null default 'all' check (audience in ('all','student','seller','admin')),
  add column if not exists mobile_image_url text,
  add column if not exists image_storage_path text,
  add column if not exists mobile_image_storage_path text,
  add column if not exists image_alt text,
  add column if not exists display_order integer not null default 100,
  add column if not exists status text not null default 'published' check (status in ('draft','scheduled','published','hidden')),
  add column if not exists is_dismissible boolean not null default false,
  add column if not exists display_frequency text not null default 'every_visit' check (display_frequency in ('every_visit','once_per_session','once_per_day')),
  add column if not exists target_department_id uuid references public.departments(id) on delete set null,
  add column if not exists target_course_id uuid references public.courses(id) on delete set null,
  add column if not exists impression_count bigint not null default 0,
  add column if not exists click_count bigint not null default 0,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;
create index if not exists idx_announcements_campaign_listing on public.announcements(audience,status,display_order,starts_at,ends_at);
create index if not exists idx_announcements_targets on public.announcements(target_department_id,target_course_id);
create table if not exists public.announcement_daily_stats (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  stat_date date not null default current_date,
  impression_count bigint not null default 0,
  click_count bigint not null default 0,
  primary key (announcement_id, stat_date)
);
create index if not exists idx_announcement_daily_stats_date on public.announcement_daily_stats(stat_date desc, announcement_id);
insert into storage.buckets (id,name,public) values ('homepage-banners','homepage-banners',true) on conflict(id) do nothing;
drop policy if exists "homepage banners public read" on storage.objects;
create policy "homepage banners public read" on storage.objects for select using(bucket_id='homepage-banners');

create or replace function public.can_view_homepage_banner(p_audience text)
returns boolean language plpgsql security definer stable set search_path=public as $$
declare v_current_role text := 'guest';
begin
  if auth.uid() is not null then select role::text into v_current_role from profiles where id=auth.uid(); v_current_role:=coalesce(v_current_role,'guest'); end if;
  if p_audience='all' then return true; end if;
  if p_audience='student' then return v_current_role in ('student','verified_student'); end if;
  if p_audience='seller' then return v_current_role='seller' or exists(select 1 from profiles where id=auth.uid() and is_seller=true); end if;
  if p_audience='admin' then return v_current_role in ('admin','super_admin'); end if;
  return false;
end; $$;

drop policy if exists "announcements publicly readable" on public.announcements;
drop policy if exists "targeted homepage announcements readable" on public.announcements;
create policy "targeted homepage announcements readable" on public.announcements for select using((is_active=true and status in ('published','scheduled') and public.can_view_homepage_banner(audience)) or is_admin());

create or replace function public.increment_announcement_impression(p_announcement_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.announcements set impression_count=impression_count+1 where id=p_announcement_id and is_active=true;
  insert into public.announcement_daily_stats(announcement_id,stat_date,impression_count) values(p_announcement_id,current_date,1)
  on conflict(announcement_id,stat_date) do update set impression_count=announcement_daily_stats.impression_count+1;
end; $$;
create or replace function public.increment_announcement_click(p_announcement_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.announcements set click_count=click_count+1 where id=p_announcement_id and is_active=true;
  insert into public.announcement_daily_stats(announcement_id,stat_date,click_count) values(p_announcement_id,current_date,1)
  on conflict(announcement_id,stat_date) do update set click_count=announcement_daily_stats.click_count+1;
end; $$;
revoke all on function public.increment_announcement_impression(uuid) from public,anon,authenticated;
grant execute on function public.increment_announcement_impression(uuid) to anon,authenticated;
revoke all on function public.increment_announcement_click(uuid) from public,anon,authenticated;
grant execute on function public.increment_announcement_click(uuid) to anon,authenticated;

alter table public.homepage_banner_settings enable row level security;
drop policy if exists "homepage banner settings public read" on public.homepage_banner_settings;
create policy "homepage banner settings public read" on public.homepage_banner_settings for select using(true);
drop policy if exists "admins manage homepage banner settings" on public.homepage_banner_settings;
create policy "admins manage homepage banner settings" on public.homepage_banner_settings for all using(is_admin()) with check(is_admin());
alter table public.announcement_daily_stats enable row level security;

create or replace function public.admin_storage_orphans(p_limit integer default 100)
returns table(bucket_id text,object_name text,object_size bigint)
language sql security definer set search_path=public,storage as $$
  select o.bucket_id,o.name,coalesce((o.metadata->>'size')::bigint,0)::bigint
  from storage.objects o
  where (auth.role()='service_role' or is_admin()) and o.bucket_id in ('files-private','files-preview','thumbnails','avatars','student-id-docs','homepage-banners')
    and not exists(select 1 from files f where f.storage_path=o.name)
    and not exists(select 1 from files f where f.preview_storage_path=o.name)
    and not exists(select 1 from files f where f.thumbnail_url like '%'||o.name)
    and not exists(select 1 from profiles p where p.avatar_url like '%'||o.name)
    and not exists(select 1 from profiles p where p.student_id_document_url=o.name)
    and not exists(select 1 from announcements a where a.image_storage_path=o.name or a.mobile_image_storage_path=o.name)
  order by o.created_at asc limit greatest(1,least(coalesce(p_limit,100),500));
$$;
