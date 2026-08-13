-- Account phone support for login and password-recovery matching.
-- Phone numbers are stored in normalized Bangladesh format: +8801XXXXXXXXX.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_number text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_number_unique
  ON profiles (phone_number)
  WHERE phone_number IS NOT NULL;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_phone_number_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_phone_number_check
  CHECK (phone_number IS NULL OR phone_number ~ '^\+8801[0-9]{9}$');

-- Keep the profile phone number in sync with signup metadata when a new auth user is created.
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, phone_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data ->> 'username', 'user_' || substr(NEW.id::text, 1, 8)),
    NULLIF(NEW.raw_user_meta_data ->> 'phone_number', '')
  )
  ON CONFLICT (id) DO UPDATE
    SET phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
