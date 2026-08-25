-- EWU StudyHub AI V2: conversational search state, semantic vectors, hybrid ranking.

create extension if not exists vector with schema extensions;

alter table public.ai_resource_analyses
  add column if not exists ai_search_document text,
  add column if not exists ai_embedding vector(768),
  add column if not exists ai_embedding_model text,
  add column if not exists ai_embedding_updated_at timestamptz;

create index if not exists idx_ai_resource_analyses_search_document_trgm
  on public.ai_resource_analyses using gin ((coalesce(ai_search_document, '')) gin_trgm_ops);

create index if not exists idx_ai_resource_analyses_embedding_hnsw
  on public.ai_resource_analyses using hnsw (ai_embedding vector_cosine_ops);

create or replace function public.search_ai_resource_embeddings(
  p_query_embedding extensions.vector(768),
  p_limit integer default 60,
  p_course_id uuid default null,
  p_department_id uuid default null
)
returns table (
  file_id uuid,
  similarity double precision
)
language sql
stable
as $$
  select
    a.file_id,
    greatest(0, 1 - (a.ai_embedding <=> (p_query_embedding::vector)))::double precision as similarity
  from public.ai_resource_analyses a
  join public.files f on f.id = a.file_id
  where f.visibility = 'published'
    and a.ai_embedding is not null
    and (p_course_id is null or f.course_id = p_course_id)
    and (p_department_id is null or f.department_id = p_department_id)
  order by a.ai_embedding <=> (p_query_embedding::vector)
  limit greatest(1, least(coalesce(p_limit, 60), 100));
$$;

create or replace function public.search_ai_course_topic_matches(
  p_terms text[],
  p_limit integer default 50
)
returns table (
  course_id uuid,
  course_code text,
  course_name text,
  matching_resources bigint
)
language sql
stable
as $$
  with matched as (
    select distinct f.course_id, f.id
    from public.files f
    join public.ai_resource_analyses a on a.file_id = f.id
    where f.visibility = 'published'
      and f.course_id is not null
      and cardinality(coalesce(p_terms, '{}'::text[])) > 0
      and exists (
        select 1
        from unnest(p_terms) as term
        where lower(coalesce(a.ai_search_document, '')) like '%' || lower(term) || '%'
           or lower(coalesce(a.ai_content_index, '')) like '%' || lower(term) || '%'
           or lower(coalesce(f.title, '')) like '%' || lower(term) || '%'
           or lower(coalesce(f.description, '')) like '%' || lower(term) || '%'
      )
  )
  select c.id, c.course_code, c.course_name, count(m.id)::bigint
  from matched m
  join public.courses c on c.id = m.course_id
  group by c.id, c.course_code, c.course_name
  order by count(m.id) desc, c.course_code asc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

-- Reindexing is intentionally server-driven because embeddings are generated from the Gemini API.
-- New resource uploads should populate ai_embedding and ai_search_document after AI analysis.
