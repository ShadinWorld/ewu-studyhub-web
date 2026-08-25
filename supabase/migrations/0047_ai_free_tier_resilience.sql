-- EWU StudyHub AI V3.2: free-tier resilience for repeated seller AI analysis.
-- Caches seller auto-fill results per authenticated seller/file-set so retries and repeated tests do not re-send the same files to Gemini.

create table if not exists public.ai_generation_cache (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  feature text not null,
  request_hash text not null,
  analysis_version text not null,
  model text not null,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  result jsonb,
  error_message text,
  expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, feature, request_hash, analysis_version, model)
);

create index if not exists idx_ai_generation_cache_owner_feature on public.ai_generation_cache(owner_id, feature, updated_at desc);
create index if not exists idx_ai_generation_cache_expiry on public.ai_generation_cache(expires_at);

alter table public.ai_generation_cache enable row level security;

create policy "AI cache owner read" on public.ai_generation_cache
  for select using (auth.uid() = owner_id);

create policy "AI cache owner insert" on public.ai_generation_cache
  for insert with check (auth.uid() = owner_id);

create policy "AI cache owner update" on public.ai_generation_cache
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

comment on table public.ai_generation_cache is 'Short-lived, per-user cache for deterministic AI analysis requests; stores structured AI output only, not original uploaded files.';
