-- EWU StudyHub student tools, admin-managed academic documents, deadlines,
-- prerequisite mappings, resource requests and homepage announcements.

DO $$ BEGIN
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'admin_message';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'announcement';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'deadline';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'resource_request_update';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

insert into storage.buckets (id, name, public)
values ('admin-documents', 'admin-documents', false)
on conflict (id) do nothing;

create table if not exists public.academic_documents (
  id uuid primary key default uuid_generate_v4(),
  document_type text not null check (document_type in ('academic_calendar','final_exam_schedule')),
  term text not null check (lower(term) in ('spring','summer','fall')),
  year integer not null check (year between 2020 and 2100),
  title text not null,
  storage_path text not null,
  file_size_bytes bigint,
  uploaded_by uuid not null references public.profiles(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(document_type, term, year)
);
create index if not exists idx_academic_documents_lookup
  on public.academic_documents(document_type, year desc, term, is_active);

create table if not exists public.course_prerequisites (
  course_id uuid not null references public.courses(id) on delete cascade,
  prerequisite_course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(course_id, prerequisite_course_id),
  check(course_id <> prerequisite_course_id)
);
create index if not exists idx_course_prerequisites_course
  on public.course_prerequisites(course_id);

create table if not exists public.deadlines (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  category text not null default 'Academic',
  term text check (term is null or lower(term) in ('spring','summer','fall')),
  year integer check (year is null or year between 2020 and 2100),
  due_at timestamptz not null,
  link text,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_deadlines_due_at on public.deadlines(is_active, due_at);

create table if not exists public.resource_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  details text,
  status text not null default 'open' check (status in ('open','in_progress','fulfilled','closed')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_resource_requests_status
  on public.resource_requests(status, created_at desc);
create index if not exists idx_resource_requests_user
  on public.resource_requests(user_id, created_at desc);

create table if not exists public.announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body text not null,
  badge text,
  cta_label text,
  cta_link text,
  image_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  priority integer not null default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_announcements_active
  on public.announcements(is_active, priority desc, starts_at desc, created_at desc);

alter table public.academic_documents enable row level security;
alter table public.course_prerequisites enable row level security;
alter table public.deadlines enable row level security;
alter table public.resource_requests enable row level security;
alter table public.announcements enable row level security;

-- Publicly readable academic information. Admins write/manage it.
drop policy if exists "academic documents readable" on public.academic_documents;
create policy "academic documents readable" on public.academic_documents
  for select using (is_active = true or is_admin());
drop policy if exists "admins manage academic documents" on public.academic_documents;
create policy "admins manage academic documents" on public.academic_documents
  for all using (is_admin()) with check (is_admin());

drop policy if exists "prerequisites readable" on public.course_prerequisites;
create policy "prerequisites readable" on public.course_prerequisites
  for select using (true);
drop policy if exists "admins manage prerequisites" on public.course_prerequisites;
create policy "admins manage prerequisites" on public.course_prerequisites
  for all using (is_admin()) with check (is_admin());

drop policy if exists "deadlines readable" on public.deadlines;
create policy "deadlines readable" on public.deadlines
  for select using (is_active = true or is_admin());
drop policy if exists "admins manage deadlines" on public.deadlines;
create policy "admins manage deadlines" on public.deadlines
  for all using (is_admin()) with check (is_admin());

drop policy if exists "users read own resource requests" on public.resource_requests;
create policy "users read own resource requests" on public.resource_requests
  for select using (user_id = auth.uid() or is_admin());
drop policy if exists "users create resource requests" on public.resource_requests;
create policy "users create resource requests" on public.resource_requests
  for insert with check (user_id = auth.uid());
drop policy if exists "admins manage resource requests" on public.resource_requests;
create policy "admins manage resource requests" on public.resource_requests
  for all using (is_admin()) with check (is_admin());

drop policy if exists "announcements readable" on public.announcements;
create policy "announcements readable" on public.announcements
  for select using (is_active = true or is_admin());
drop policy if exists "admins manage announcements" on public.announcements;
create policy "admins manage announcements" on public.announcements
  for all using (is_admin()) with check (is_admin());

-- Storage is private; server actions generate short-lived signed URLs.
drop policy if exists "admins manage admin documents" on storage.objects;
create policy "admins manage admin documents" on storage.objects
  for all using (bucket_id = 'admin-documents' and is_admin())
  with check (bucket_id = 'admin-documents' and is_admin());

create or replace function public.update_deadline_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_deadlines_updated_at on public.deadlines;
create trigger trg_deadlines_updated_at before update on public.deadlines
for each row execute function public.update_deadline_updated_at();

drop trigger if exists trg_resource_requests_updated_at on public.resource_requests;
create trigger trg_resource_requests_updated_at before update on public.resource_requests
for each row execute function public.update_deadline_updated_at();

drop trigger if exists trg_announcements_updated_at on public.announcements;
create trigger trg_announcements_updated_at before update on public.announcements
for each row execute function public.update_deadline_updated_at();
