-- EWU StudyHub: restore the prerequisite mapping table required by the
-- admin-managed Prerequisite Checker tool introduced in later updates.
-- Migration 0022 intentionally removed this feature/table. The tool is now
-- re-enabled, so recreate only its minimal backing table and policies.

create table if not exists public.course_prerequisites (
  course_id uuid not null references public.courses(id) on delete cascade,
  prerequisite_course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(course_id, prerequisite_course_id),
  check(course_id <> prerequisite_course_id)
);

create index if not exists idx_course_prerequisites_course
  on public.course_prerequisites(course_id);

alter table public.course_prerequisites enable row level security;

drop policy if exists "prerequisites readable" on public.course_prerequisites;
create policy "prerequisites readable" on public.course_prerequisites
  for select using (true);

drop policy if exists "admins manage prerequisites" on public.course_prerequisites;
create policy "admins manage prerequisites" on public.course_prerequisites
  for all using (is_admin()) with check (is_admin());
