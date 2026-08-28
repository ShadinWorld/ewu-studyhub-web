-- EWU StudyHub: auto-seller for verified EWU student Google accounts.
--
-- If a new auth.users row's email matches the official EWU student email
-- format (the same pattern already enforced by request_seller_verification
-- in 0017_google_auth_ewu_verification.sql), the account is created as an
-- already-verified seller. This assumes EWU student Google accounts are
-- issued/controlled by the university (Google Workspace), so the OAuth
-- email itself is a trustworthy verification signal.
--
-- This does NOT collect a bKash payout number. Upload access still requires
-- a saved bKash number (enforced server-side in the upload API), so a new
-- auto-seller must visit Dashboard -> Payment Settings before their first
-- upload. This preserves financial safety: no payout number is ever
-- fabricated or defaulted.

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
    insert into public.notifications (profile_id, type, title, body, link)
    values (
      new.id,
      'seller_approved',
      'You are an EWU verified seller',
      'Your EWU student email verified you as a seller automatically. Add your bKash number in Payment Settings before your first upload — that is the number your resource sale earnings will be sent to.',
      '/dashboard/payment-settings'
    );
  end if;

  return new;
end;
$$;
