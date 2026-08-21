# EWU StudyHub — Account, Search & Mobile UX Update

Implemented in this package:

- Fixed course/resource search, including compact course codes such as `ACT201` and `CSE303`.
- Removed the three low-value homepage benefit cards.
- Two-column mobile grids for courses, departments, and resources where appropriate.
- Signup now accepts any valid email and requires a Bangladesh phone number for account recovery and phone login.
- Login accepts either email or phone number in one field.
- Forgot password requires the account email + phone number match, then sends a secure email reset link. No OTP flow is included.
- Added `/reset-password` for creating a new password after opening the email reset link.
- Seller verification still requires an official EWU student email; if the signup email is already an EWU student email, it is prefilled.
- Added signup reminders to keep the email and phone number accessible.

## Supabase

Run the new migration:

`supabase/migrations/0014_account_phone_and_password_recovery.sql`

This adds `profiles.phone_number`, a unique index, validation, and updates the auth profile trigger to save the phone number at signup.
