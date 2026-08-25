-- EWU StudyHub AI V3.1: richer seller bundle analysis + admin AI review evidence.

alter table public.ai_resource_analyses
  add column if not exists ai_group_type text not null default 'single'
    check (ai_group_type in ('single', 'related_bundle', 'mixed_bundle')),
  add column if not exists ai_file_breakdown jsonb not null default '[]'::jsonb,
  add column if not exists ai_group_conflicts jsonb not null default '[]'::jsonb,
  add column if not exists ai_raw_analysis jsonb,
  add column if not exists moderation_summary text,
  add column if not exists moderation_evidence jsonb not null default '[]'::jsonb,
  add column if not exists moderation_reviewed_at timestamptz,
  add column if not exists moderation_model text,
  add column if not exists ai_analysis_version text;

create index if not exists idx_ai_resource_analyses_group_type
  on public.ai_resource_analyses(ai_group_type);

create index if not exists idx_ai_resource_analyses_moderation_review
  on public.ai_resource_analyses(moderation_reviewed_at desc);

comment on column public.ai_resource_analyses.ai_group_type is 'AI classification of the seller-selected file set: single, related_bundle, or mixed_bundle.';
comment on column public.ai_resource_analyses.ai_file_breakdown is 'Per-file AI understanding kept alongside the group-level metadata.';
comment on column public.ai_resource_analyses.ai_raw_analysis is 'Structured AI output snapshot for audit/debugging; never exposed directly to buyers.';
comment on column public.ai_resource_analyses.moderation_summary is 'Admin-facing AI moderation summary; advisory only.';
