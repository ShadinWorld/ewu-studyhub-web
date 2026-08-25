-- EWU StudyHub: schema alignment for Help/Guide management and preview analytics.
-- Safe to re-run: creates only missing tables/columns/indexes/policies.

create table if not exists public.help_items (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  role_scope text not null default 'general',
  title text not null,
  intro text not null default '',
  how_to text,
  benefits text,
  notes text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guide_sections (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  section_group text not null default 'general',
  title text not null,
  summary text not null default '',
  what_is text not null default '',
  how_to text,
  benefits text,
  notes text,
  action_label text,
  action_href text,
  required_access text not null default 'public',
  locked_message text,
  locked_action_label text,
  locked_action_href text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guide_overview_items (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  role_scope text not null default 'general',
  kind text not null default 'capability',
  title text not null,
  summary text not null default '',
  benefit text,
  action_label text,
  action_href text,
  required_access text not null default 'public',
  locked_message text,
  locked_action_label text,
  locked_action_href text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reconcile existing/manual versions without destructive alters.
alter table public.help_items add column if not exists slug text;
alter table public.help_items add column if not exists role_scope text default 'general';
alter table public.help_items add column if not exists title text default '';
alter table public.help_items add column if not exists intro text default '';
alter table public.help_items add column if not exists how_to text;
alter table public.help_items add column if not exists benefits text;
alter table public.help_items add column if not exists notes text;
alter table public.help_items add column if not exists status text default 'draft';
alter table public.help_items add column if not exists sort_order integer default 0;
alter table public.help_items add column if not exists created_at timestamptz default now();
alter table public.help_items add column if not exists updated_at timestamptz default now();

alter table public.guide_sections add column if not exists slug text;
alter table public.guide_sections add column if not exists section_group text default 'general';
alter table public.guide_sections add column if not exists title text default '';
alter table public.guide_sections add column if not exists summary text default '';
alter table public.guide_sections add column if not exists what_is text default '';
alter table public.guide_sections add column if not exists how_to text;
alter table public.guide_sections add column if not exists benefits text;
alter table public.guide_sections add column if not exists notes text;
alter table public.guide_sections add column if not exists action_label text;
alter table public.guide_sections add column if not exists action_href text;
alter table public.guide_sections add column if not exists required_access text default 'public';
alter table public.guide_sections add column if not exists locked_message text;
alter table public.guide_sections add column if not exists locked_action_label text;
alter table public.guide_sections add column if not exists locked_action_href text;
alter table public.guide_sections add column if not exists status text default 'draft';
alter table public.guide_sections add column if not exists sort_order integer default 0;
alter table public.guide_sections add column if not exists created_at timestamptz default now();
alter table public.guide_sections add column if not exists updated_at timestamptz default now();

alter table public.guide_overview_items add column if not exists slug text;
alter table public.guide_overview_items add column if not exists role_scope text default 'general';
alter table public.guide_overview_items add column if not exists kind text default 'capability';
alter table public.guide_overview_items add column if not exists title text default '';
alter table public.guide_overview_items add column if not exists summary text default '';
alter table public.guide_overview_items add column if not exists benefit text;
alter table public.guide_overview_items add column if not exists action_label text;
alter table public.guide_overview_items add column if not exists action_href text;
alter table public.guide_overview_items add column if not exists required_access text default 'public';
alter table public.guide_overview_items add column if not exists locked_message text;
alter table public.guide_overview_items add column if not exists locked_action_label text;
alter table public.guide_overview_items add column if not exists locked_action_href text;
alter table public.guide_overview_items add column if not exists status text default 'draft';
alter table public.guide_overview_items add column if not exists sort_order integer default 0;
alter table public.guide_overview_items add column if not exists created_at timestamptz default now();
alter table public.guide_overview_items add column if not exists updated_at timestamptz default now();

create index if not exists idx_help_items_role_status_order on public.help_items(role_scope, status, sort_order);
create index if not exists idx_guide_sections_group_status_order on public.guide_sections(section_group, status, sort_order);
create index if not exists idx_guide_overview_role_status_order on public.guide_overview_items(role_scope, status, sort_order);

-- Keep public guide reading available while leaving writes admin/service-role controlled.
alter table public.help_items enable row level security;
alter table public.guide_sections enable row level security;
alter table public.guide_overview_items enable row level security;

drop policy if exists "published help items are readable" on public.help_items;
create policy "published help items are readable" on public.help_items
  for select using (status = 'published' or is_admin());

drop policy if exists "published guide sections are readable" on public.guide_sections;
create policy "published guide sections are readable" on public.guide_sections
  for select using (status = 'published' or is_admin());

drop policy if exists "published guide overview is readable" on public.guide_overview_items;
create policy "published guide overview is readable" on public.guide_overview_items
  for select using (status = 'published' or is_admin());

-- Preview analytics RPC was referenced by the existing preview endpoint but was missing
-- from the typed schema/migrations. Track daily preview requests without changing the
-- existing file views/download counters.
alter table public.file_daily_stats add column if not exists preview_requests integer not null default 0;

create or replace function public.increment_preview_request(p_file_id uuid) returns void as $$
begin
  insert into public.file_daily_stats (file_id, date, preview_requests)
    values (p_file_id, current_date, 1)
  on conflict (file_id, date)
  do update set preview_requests = public.file_daily_stats.preview_requests + 1;
end;
$$ language plpgsql security definer;

-- Secure updated_at consistency for the help tables.
drop trigger if exists trg_help_items_updated_at on public.help_items;
create trigger trg_help_items_updated_at before update on public.help_items
  for each row execute function public.set_updated_at();
drop trigger if exists trg_guide_sections_updated_at on public.guide_sections;
create trigger trg_guide_sections_updated_at before update on public.guide_sections
  for each row execute function public.set_updated_at();
drop trigger if exists trg_guide_overview_items_updated_at on public.guide_overview_items;
create trigger trg_guide_overview_items_updated_at before update on public.guide_overview_items
  for each row execute function public.set_updated_at();
