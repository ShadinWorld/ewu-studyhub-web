-- EWU StudyHub — retire username completely and keep signup trigger working.
-- Safe to run whether the username column is still present or was already removed.

BEGIN;

-- public_profiles depends on profiles.username, so remove the old view first.
DROP VIEW IF EXISTS public.public_profiles;

-- Rebuild the auth trigger without username before removing the column.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'New User'),
    NULLIF(NEW.raw_user_meta_data ->> 'phone_number', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS username;

-- Recreate the public profile view without username.
CREATE VIEW public.public_profiles AS
SELECT
  id,
  full_name,
  avatar_url
FROM public.profiles;

COMMIT;
