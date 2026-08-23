-- EWU StudyHub — storage health, preview request observability and safe cleanup.
-- Supabase provider quota/billing remains authoritative for actual plan limits/egress.

create table if not exists public.storage_usage_snapshots (
  snapshot_date date not null,
  bucket_id text not null,
  object_count bigint not null default 0,
  total_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  primary key (snapshot_date, bucket_id)
);

alter table public.storage_usage_snapshots enable row level security;
revoke all on table public.storage_usage_snapshots from public, anon, authenticated;

create table if not exists public.file_preview_daily_stats (
  file_id uuid not null references public.files(id) on delete cascade,
  stat_date date not null,
  request_count bigint not null default 0,
  primary key (file_id, stat_date)
);

alter table public.file_preview_daily_stats enable row level security;
revoke all on table public.file_preview_daily_stats from public, anon, authenticated;

create index if not exists idx_file_preview_daily_stats_date
  on public.file_preview_daily_stats(stat_date desc);

create or replace function public.admin_storage_record_snapshot()
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required';
  end if;

  insert into public.storage_usage_snapshots(snapshot_date, bucket_id, object_count, total_bytes)
  select current_date,
         o.bucket_id,
         count(*)::bigint,
         coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint
  from storage.objects o
  group by o.bucket_id
  on conflict (snapshot_date, bucket_id)
  do update set
    object_count = excluded.object_count,
    total_bytes = excluded.total_bytes,
    created_at = now();
end;
$$;

create or replace function public.admin_storage_history(p_days integer default 30)
returns table(snapshot_date date, bucket_id text, object_count bigint, total_bytes bigint)
language sql
security definer
set search_path = public
as $$
  select s.snapshot_date, s.bucket_id, s.object_count, s.total_bytes
  from public.storage_usage_snapshots s
  where (auth.role() = 'service_role' or is_admin())
    and s.snapshot_date >= current_date - greatest(1, least(coalesce(p_days, 30), 90)) + 1
  order by s.snapshot_date asc, s.bucket_id asc;
$$;

create or replace function public.increment_preview_request(p_file_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required';
  end if;

  insert into public.file_preview_daily_stats(file_id, stat_date, request_count)
  values (p_file_id, current_date, 1)
  on conflict (file_id, stat_date)
  do update set request_count = public.file_preview_daily_stats.request_count + 1;
end;
$$;

create or replace function public.admin_preview_request_summary(p_days integer default 7)
returns table(total_requests bigint, active_resources bigint)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(sum(s.request_count), 0)::bigint as total_requests,
    count(distinct s.file_id)::bigint as active_resources
  from public.file_preview_daily_stats s
  where (auth.role() = 'service_role' or is_admin())
    and s.stat_date >= current_date - greatest(1, least(coalesce(p_days, 7), 30)) + 1;
$$;

create or replace function public.admin_storage_orphans(p_limit integer default 100)
returns table(bucket_id text, object_name text, object_size bigint)
language sql
security definer
set search_path = public, storage
as $$
  select o.bucket_id,
         o.name,
         coalesce((o.metadata->>'size')::bigint, 0)::bigint
  from storage.objects o
  where (auth.role() = 'service_role' or is_admin())
    and o.bucket_id in ('files-private','files-preview','thumbnails','avatars','student-id-docs','homepage-banners')
    -- Keep a grace period so a just-created object is not deleted during a
    -- slow/failed database transaction or a temporary retry window.
    and o.created_at < now() - interval '24 hours'
    and not exists (select 1 from files f where f.storage_path = o.name)
    and not exists (select 1 from files f where f.preview_storage_path = o.name)
    and not exists (select 1 from files f where f.thumbnail_url like '%' || o.name)
    and not exists (select 1 from profiles p where p.avatar_url like '%' || o.name)
    and not exists (select 1 from profiles p where p.student_id_document_url = o.name)
    and not exists (select 1 from announcements a where a.image_storage_path = o.name or a.mobile_image_storage_path = o.name)
  order by o.created_at asc
  limit greatest(1, least(coalesce(p_limit,100),500));
$$;

revoke all on function public.admin_storage_record_snapshot() from public, anon, authenticated;
grant execute on function public.admin_storage_record_snapshot() to service_role;
revoke all on function public.admin_storage_history(integer) from public, anon, authenticated;
grant execute on function public.admin_storage_history(integer) to service_role;
revoke all on function public.increment_preview_request(uuid) from public, anon, authenticated;
grant execute on function public.increment_preview_request(uuid) to service_role;
revoke all on function public.admin_preview_request_summary(integer) from public, anon, authenticated;
grant execute on function public.admin_preview_request_summary(integer) to service_role;
revoke all on function public.admin_storage_orphans(integer) from public, anon, authenticated;
grant execute on function public.admin_storage_orphans(integer) to service_role;
