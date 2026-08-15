-- EWU StudyHub: Google-only authentication, mandatory phone completion,
-- EWU ID-card verification, and username removal.

-- Recreate the public profile view without the legacy username dependency.
drop view if exists public.public_profiles;
create view public.public_profiles as
select id, full_name, avatar_url
from public.profiles;

-- Username is no longer part of the application model.
alter table public.profiles drop column if exists username;

-- Google profile photo + mandatory phone are stored on the profile.
alter table public.profiles add column if not exists phone_number text;
create unique index if not exists idx_profiles_phone_number_unique
  on public.profiles(phone_number)
  where phone_number is not null;

alter table public.profiles drop constraint if exists profiles_phone_number_check;
alter table public.profiles add constraint profiles_phone_number_check
  check (phone_number is null or phone_number ~ '^\+8801[0-9]{9}$');

-- ID card path is private storage. The admin dashboard generates a short-lived signed URL.
alter table public.profiles add column if not exists student_id_document_url text;

-- Ensure the auth trigger no longer references username and captures Google metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    avatar_url,
    role,
    is_seller,
    phone_number
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    'student',
    false,
    nullif(new.raw_user_meta_data->>'phone_number', '')
  )
  on conflict (id) do update
    set full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        phone_number = coalesce(excluded.phone_number, public.profiles.phone_number);
  return new;
end;
$$;

-- Replace the seller-request RPC with an ID-card upload path argument.
drop function if exists public.request_seller_verification(text, text);
create or replace function public.request_seller_verification(
  p_university_email text,
  p_bkash_number text,
  p_student_id_document_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized_email text := lower(trim(p_university_email));
  normalized_bkash text := trim(p_bkash_number);
  student_id_value text;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if normalized_email !~ '^[0-9]{4}-[0-9]-[0-9]{2}-[0-9]{3}@std\.ewubd\.edu$' then raise exception 'Enter a valid EWU student email.'; end if;
  if normalized_bkash !~ '^01[0-9]{9}$' then raise exception 'Enter a valid 11-digit bKash number.'; end if;
  if p_student_id_document_path is null or p_student_id_document_path not like uid::text || '/%' then raise exception 'Invalid student ID document.'; end if;
  if exists (select 1 from profiles where lower(university_email) = normalized_email and id <> uid) then raise exception 'This EWU student ID is already registered to another account.'; end if;

  student_id_value := split_part(normalized_email, '@', 1);
  update profiles
  set university_email = normalized_email,
      student_id = student_id_value,
      seller_bkash_number = normalized_bkash,
      student_id_document_url = p_student_id_document_path,
      university_email_verified = false,
      student_id_verification_status = 'pending',
      updated_at = now()
  where id = uid;

  if not found then raise exception 'Profile not found'; end if;
end;
$$;
revoke all on function public.request_seller_verification(text, text, text) from public;
grant execute on function public.request_seller_verification(text, text, text) to authenticated;

-- Keep private ID-card storage owner-only for normal clients. Admins use service-role signed URLs server-side.
insert into storage.buckets (id, name, public)
values ('student-id-docs', 'student-id-docs', false)
on conflict (id) do nothing;

-- Existing projects may already have these policies from 0003.
drop policy if exists "owner reads own id doc" on storage.objects;
drop policy if exists "owner uploads own id doc" on storage.objects;
create policy "owner reads own id doc"
  on storage.objects for select
  using (bucket_id = 'student-id-docs' and owner = auth.uid());
create policy "owner uploads own id doc"
  on storage.objects for insert
  with check (bucket_id = 'student-id-docs' and owner = auth.uid());
