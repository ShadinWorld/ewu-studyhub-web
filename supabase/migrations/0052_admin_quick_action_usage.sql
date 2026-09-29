-- EWU StudyHub — Admin Dashboard Quick Action usage ranking
-- Per-admin usage is stored so frequently used controls can move to the top.

create table if not exists public.admin_quick_action_usage (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  action_key text not null check (char_length(trim(action_key)) between 1 and 100),
  use_count bigint not null default 0 check (use_count >= 0),
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (profile_id, action_key)
);

create index if not exists idx_admin_quick_action_usage_profile_rank
  on public.admin_quick_action_usage(profile_id, use_count desc, last_used_at desc);

alter table public.admin_quick_action_usage enable row level security;

drop policy if exists "admin quick action usage own read" on public.admin_quick_action_usage;
create policy "admin quick action usage own read"
  on public.admin_quick_action_usage
  for select
  using (profile_id = auth.uid() and is_admin());

drop policy if exists "admin quick action usage no client insert" on public.admin_quick_action_usage;
create policy "admin quick action usage no client insert"
  on public.admin_quick_action_usage
  for insert
  with check (false);

drop policy if exists "admin quick action usage no client update" on public.admin_quick_action_usage;
create policy "admin quick action usage no client update"
  on public.admin_quick_action_usage
  for update
  using (false)
  with check (false);

drop policy if exists "admin quick action usage no client delete" on public.admin_quick_action_usage;
create policy "admin quick action usage no client delete"
  on public.admin_quick_action_usage
  for delete
  using (false);

create or replace function public.record_admin_quick_action_use(p_action_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized_key text := nullif(trim(coalesce(p_action_key, '')), '');
begin
  if uid is null or not is_admin() then
    raise exception 'Not authorized';
  end if;

  if normalized_key is null or char_length(normalized_key) > 100 then
    raise exception 'Invalid quick action key';
  end if;

  insert into public.admin_quick_action_usage(profile_id, action_key, use_count, last_used_at)
  values (uid, normalized_key, 1, now())
  on conflict (profile_id, action_key)
  do update set
    use_count = public.admin_quick_action_usage.use_count + 1,
    last_used_at = now();
end;
$$;

revoke all on function public.record_admin_quick_action_use(text) from public, anon;
grant execute on function public.record_admin_quick_action_use(text) to authenticated;
