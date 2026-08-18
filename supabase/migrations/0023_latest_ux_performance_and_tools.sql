-- EWU StudyHub latest UX/performance/security updates.

DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'seller_approved'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- 1) Academic calendar/exam documents accept PDF or image.
-- 2) Indexes for fast resource/user/admin queries.
-- 3) Database-level protection against buying own resource.

alter table public.academic_documents
  add column if not exists mime_type text not null default 'application/pdf';

alter table public.academic_documents
  drop constraint if exists academic_documents_mime_type_check;
alter table public.academic_documents
  add constraint academic_documents_mime_type_check
  check (mime_type in ('application/pdf','image/jpeg','image/png','image/webp','image/gif'));

create index if not exists idx_files_visibility_created_at
  on public.files(visibility, created_at desc);
create index if not exists idx_files_seller_created_at
  on public.files(seller_id, created_at desc);
create index if not exists idx_profiles_created_at
  on public.profiles(created_at desc);
create index if not exists idx_profiles_role_status_created_at
  on public.profiles(role, account_status, created_at desc);

-- Prevent self-purchase at the database level as well as in application code.
create or replace function public.prevent_self_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  seller uuid;
begin
  if NEW.file_id is not null then
    select seller_id into seller from public.files where id = NEW.file_id;
    if seller is not null and seller = NEW.buyer_id then
      raise exception 'You cannot purchase your own resource.';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_prevent_self_purchase on public.purchases;
create trigger trg_prevent_self_purchase
before insert or update on public.purchases
for each row execute function public.prevent_self_purchase();
