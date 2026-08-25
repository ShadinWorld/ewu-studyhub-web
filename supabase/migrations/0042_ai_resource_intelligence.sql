-- EWU StudyHub AI V1: seller AI metadata, search index, moderation signals, and seller verification audit.

create table if not exists public.ai_resource_analyses (
  id uuid primary key default uuid_generate_v4(),
  file_id uuid not null unique references public.files(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'completed' check (status in ('pending','completed','failed')),
  model text,
  ai_title text,
  ai_description text,
  ai_course_code text,
  ai_course_name text,
  ai_department_name text,
  ai_category text,
  ai_semester text,
  ai_year integer,
  ai_tags text[] default '{}',
  ai_topics text[] default '{}',
  ai_summary text,
  ai_content_index text,
  ai_difficulty text,
  ai_reading_time_minutes integer,
  ai_confidence numeric(4,3),
  moderation_flags jsonb not null default '[]'::jsonb,
  moderation_risk_score numeric(5,2) not null default 0,
  source_consent boolean not null default false,
  seller_edited_at timestamptz,
  seller_final_snapshot jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ai_resource_analyses_seller on public.ai_resource_analyses(seller_id);
create index if not exists idx_ai_resource_analyses_status on public.ai_resource_analyses(status);
create index if not exists idx_ai_resource_analyses_risk on public.ai_resource_analyses(moderation_risk_score desc);
create index if not exists idx_ai_resource_analyses_content_trgm on public.ai_resource_analyses using gin ((coalesce(ai_content_index,'')) gin_trgm_ops);

alter table public.profiles
  add column if not exists ai_seller_verification_status text not null default 'not_checked'
    check (ai_seller_verification_status in ('not_checked','match','mismatch','review'));
alter table public.profiles add column if not exists ai_seller_verification_email text;
alter table public.profiles add column if not exists ai_seller_verification_confidence numeric(4,3);
alter table public.profiles add column if not exists ai_seller_verification_checked_at timestamptz;

alter table public.ai_resource_analyses enable row level security;
drop policy if exists "seller reads own ai resource analysis" on public.ai_resource_analyses;
create policy "seller reads own ai resource analysis"
  on public.ai_resource_analyses for select
  using (seller_id = auth.uid() or is_admin());
drop policy if exists "admin reads ai resource analysis" on public.ai_resource_analyses;
create policy "admin reads ai resource analysis"
  on public.ai_resource_analyses for select
  using (is_admin());

-- No public insert/update/delete policy: server-side admin/service-role operations own writes.
