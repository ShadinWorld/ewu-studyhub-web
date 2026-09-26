-- EWU StudyHub: separate Seller access from payout readiness.
--
-- Product rules:
--   1. A verified Seller may upload Free Resources without a bKash payout number.
--   2. A Seller must have a valid bKash payout number before publishing Paid Resources.
--   3. A direct EWU student Google account is still auto-created as a verified Seller.
--   4. New Google OAuth users must not get trapped by a notification/provisioning hiccup.

-- Optional bKash during manual Seller verification. Sellers can add it later from
-- Payment Settings before publishing Paid Resources or receiving earnings.
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
  normalized_bkash text := nullif(trim(coalesce(p_bkash_number, '')), '');
  student_id_value text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if normalized_email !~ '^[0-9]{4}-[0-9]-[0-9]{2}-[0-9]{3}@std\.ewubd\.edu$' then
    raise exception 'Enter a valid EWU student email.';
  end if;

  if normalized_bkash is not null and normalized_bkash !~ '^01[0-9]{9}$' then
    raise exception 'Enter a valid 11-digit bKash number.';
  end if;

  if p_student_id_document_path is null or p_student_id_document_path not like uid::text || '/%' then
    raise exception 'Invalid student ID document.';
  end if;

  if exists (
    select 1 from profiles
    where lower(university_email) = normalized_email
      and id <> uid
  ) then
    raise exception 'This EWU student ID is already registered to another account.';
  end if;

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

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

revoke all on function public.request_seller_verification(text, text, text) from public;
grant execute on function public.request_seller_verification(text, text, text) to authenticated;

-- Recreate the new-user trigger so an incidental notification failure does not
-- abort account provisioning. The core profile write remains authoritative.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(coalesce(new.email, ''));
  is_ewu_student_email boolean := normalized_email ~ '^[0-9]{4}-[0-9]-[0-9]{2}-[0-9]{3}@std\.ewubd\.edu$';
begin
  insert into public.profiles (
    id,
    full_name,
    avatar_url,
    role,
    is_seller,
    phone_number,
    university_email,
    university_email_verified,
    student_id,
    student_id_verification_status
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    case when is_ewu_student_email then 'seller' else 'student' end,
    is_ewu_student_email,
    nullif(new.raw_user_meta_data->>'phone_number', ''),
    case when is_ewu_student_email then normalized_email else null end,
    is_ewu_student_email,
    case when is_ewu_student_email then split_part(normalized_email, '@', 1) else null end,
    case when is_ewu_student_email then 'verified' else 'unverified' end
  )
  on conflict (id) do update
    set full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        phone_number = coalesce(excluded.phone_number, public.profiles.phone_number);

  if is_ewu_student_email then
    begin
      insert into public.notifications (profile_id, type, title, body, link)
      values (
        new.id,
        'seller_approved',
        'You are an EWU verified seller',
        'Your EWU student email verified you as a seller automatically. Free Resources can be uploaded without bKash; add your bKash number before publishing Paid Resources or receiving earnings.',
        '/dashboard/payment-settings'
      );
    exception when others then
      raise warning 'Auto-seller notification failed for user %: %', new.id, sqlerrm;
    end;
  end if;

  return new;
end;
$$;

comment on function public.request_seller_verification(text, text, text) is
  'Creates a Seller verification request. bKash is optional during verification and becomes mandatory for Paid Resource publishing/payout readiness.';
