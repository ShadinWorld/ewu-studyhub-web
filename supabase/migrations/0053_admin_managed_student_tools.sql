-- EWU StudyHub: admin-managed Student Academic Tools catalog.
-- Admins can show/hide existing tools and add custom tool links without
-- changing the underlying academic-tool feature implementation.

create table if not exists public.student_tool_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  href text not null,
  icon text not null default 'GraduationCap',
  is_active boolean not null default true,
  is_builtin boolean not null default false,
  display_order integer not null default 100,
  open_in_new_tab boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_tool_catalog_title_check check (char_length(trim(title)) between 2 and 120),
  constraint student_tool_catalog_href_check check (
    href ~ '^/' or href ~ '^https://'
  )
);

create index if not exists idx_student_tool_catalog_active_order
  on public.student_tool_catalog(is_active, display_order, created_at);

alter table public.student_tool_catalog enable row level security;

drop policy if exists "student tools public read" on public.student_tool_catalog;
create policy "student tools public read"
on public.student_tool_catalog
for select
using (is_active = true or is_admin());

drop policy if exists "student tools admins manage" on public.student_tool_catalog;
create policy "student tools admins manage"
on public.student_tool_catalog
for all
using (is_admin())
with check (is_admin());

create or replace function public.set_student_tool_catalog_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_student_tool_catalog_updated_at on public.student_tool_catalog;
create trigger trg_student_tool_catalog_updated_at
before update on public.student_tool_catalog
for each row execute function public.set_student_tool_catalog_updated_at();

insert into public.student_tool_catalog
  (slug, title, description, href, icon, is_active, is_builtin, display_order)
values
  ('academic-calendar', 'Academic Calendar', 'See the latest EWU academic calendar for your semester.', '/tools/academic-calendar', 'CalendarDays', true, true, 10),
  ('final-exams', 'Final Exam Schedule', 'Open the latest final exam schedule by term.', '/tools/final-exams', 'ClipboardCheck', true, true, 20),
  ('deadlines', 'Deadline Tracker', 'Keep important academic and StudyHub deadlines in one place.', '/tools/deadlines', 'FileClock', true, true, 30),
  ('resource-request', 'Request a Resource', 'Ask the StudyHub community for a missing note, question bank or other resource.', '/tools/resource-request', 'FileQuestion', true, true, 40)
on conflict (slug) do update
set title = excluded.title,
    description = excluded.description,
    href = excluded.href,
    icon = excluded.icon,
    is_builtin = true,
    display_order = excluded.display_order;

revoke all on public.student_tool_catalog from anon, authenticated;
grant select on public.student_tool_catalog to anon, authenticated;
