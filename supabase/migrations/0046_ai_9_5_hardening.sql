-- EWU StudyHub AI 9.5 hardening: preserve seller-edited AI metadata and deterministic admin risk factors.

alter table public.ai_resource_analyses
  add column if not exists seller_final_ai_metadata jsonb,
  add column if not exists moderation_factors jsonb not null default '{}'::jsonb,
  add column if not exists moderation_decision_hint text
    check (moderation_decision_hint is null or moderation_decision_hint in ('approve','review','reject'));

create or replace function public.search_admin_ai_similar_resources(
  p_file_id uuid,
  p_query_embedding extensions.vector(768),
  p_limit integer default 12
)
returns table (
  file_id uuid,
  title text,
  seller_id uuid,
  similarity double precision,
  visibility text
)
language sql
stable
as $$
  select
    a.file_id,
    f.title,
    f.seller_id,
    greatest(0, 1 - (a.ai_embedding <=> (p_query_embedding::vector)))::double precision as similarity,
    f.visibility::text
  from public.ai_resource_analyses a
  join public.files f on f.id = a.file_id
  where a.file_id <> p_file_id
    and a.ai_embedding is not null
    and f.visibility <> 'rejected'
  order by a.ai_embedding <=> (p_query_embedding::vector)
  limit greatest(1, least(coalesce(p_limit, 12), 25));
$$;

comment on column public.ai_resource_analyses.seller_final_ai_metadata is 'Seller-approved edits to AI-suggested tags/topics/difficulty/study-time metadata; original AI analysis remains preserved separately.';
comment on column public.ai_resource_analyses.moderation_factors is 'Deterministic admin moderation/anomaly evidence used to explain the AI review score.';
