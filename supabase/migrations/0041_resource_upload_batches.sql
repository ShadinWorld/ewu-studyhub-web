-- EWU StudyHub — grouped multi-file resource uploads.
-- A batch represents one logical resource card with up to three attached files.
-- Existing files remain valid with NULL upload_batch_id.

alter table public.files
  add column if not exists upload_batch_id uuid;

create index if not exists idx_files_upload_batch_id
  on public.files(upload_batch_id)
  where upload_batch_id is not null;

-- Keep grouping usable for published/owner/admin reads; existing file RLS remains authoritative.

-- Description is also searched with ILIKE; keep the partial-match path indexed.
create index if not exists idx_files_description_trgm
  on public.files using gin (description gin_trgm_ops);
