-- EWU StudyHub Update 0051
-- Reliable browser downloads, server-side view dedupe, and Admin-only activity history.

-- -----------------------------------------------------------------------------
-- Resource view dedupe
-- -----------------------------------------------------------------------------
create table if not exists public.resource_view_dedup (
  file_id uuid not null references public.files(id) on delete cascade,
  visitor_key text not null check (char_length(visitor_key) between 16 and 160),
  last_viewed_at timestamptz not null default now(),
  primary key (file_id, visitor_key)
);

create index if not exists idx_resource_view_dedup_last_viewed
  on public.resource_view_dedup(last_viewed_at);

alter table public.resource_view_dedup enable row level security;
revoke all on public.resource_view_dedup from anon, authenticated;

create or replace function public.record_resource_view(
  p_file_id uuid,
  p_visitor_key text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  last_seen timestamptz;
  counted boolean := false;
  cutoff timestamptz := now() - interval '30 minutes';
begin
  if p_file_id is null or p_visitor_key is null or char_length(trim(p_visitor_key)) < 16 then
    return false;
  end if;

  if not exists (
    select 1 from public.files
    where id = p_file_id and visibility = 'published'
  ) then
    return false;
  end if;

  select last_viewed_at
    into last_seen
  from public.resource_view_dedup
  where file_id = p_file_id
    and visitor_key = p_visitor_key
  for update;

  if not found then
    insert into public.resource_view_dedup(file_id, visitor_key, last_viewed_at)
    values (p_file_id, p_visitor_key, now());
    counted := true;
  elsif last_seen <= cutoff then
    update public.resource_view_dedup
    set last_viewed_at = now()
    where file_id = p_file_id
      and visitor_key = p_visitor_key;
    counted := true;
  end if;

  if counted then
    update public.files
    set views_count = coalesce(views_count, 0) + 1
    where id = p_file_id;

    insert into public.file_daily_stats(file_id, date, views)
    values (p_file_id, current_date, 1)
    on conflict (file_id, date)
    do update set views = public.file_daily_stats.views + 1;
  end if;

  return counted;
end;
$$;

revoke all on function public.record_resource_view(uuid, text) from public;
grant execute on function public.record_resource_view(uuid, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Activity history: Admin-only read access
-- -----------------------------------------------------------------------------
drop policy if exists "user history own read" on public.user_activity_history;
drop policy if exists "user history admin read" on public.user_activity_history;
create policy "user history admin read"
  on public.user_activity_history
  for select
  using (is_admin());

-- Keep client-side inserts blocked; record_user_activity() remains the supported
-- SECURITY DEFINER write path used by the application.
drop policy if exists "user history no client insert" on public.user_activity_history;
create policy "user history no client insert"
  on public.user_activity_history
  for insert
  with check (false);

-- Old rows remain available to Admins. Remove only stale dedupe keys periodically
-- from a controlled server/admin cleanup job if needed.

-- Keep dashboard help text aligned with the removal of user-facing Home Recent Activity.
update public.help_items
set
  intro = 'Dashboard এক জায়গা থেকে আপনার গুরুত্বপূর্ণ কাজ ও account status দেখার কেন্দ্র।',
  how_to = 'Quick action, notification এবং প্রয়োজনীয় status card দেখে আপনার পরের কাজটি খুলুন।',
  benefits = 'এক জায়গা থেকে গুরুত্বপূর্ণ কাজ, pending status এবং প্রয়োজনীয় shortcut পাওয়া যায়।',
  updated_at = now()
where slug = 'dashboard_overview';
