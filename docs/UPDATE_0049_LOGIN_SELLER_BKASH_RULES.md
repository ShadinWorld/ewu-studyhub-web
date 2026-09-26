# Update 0049 — Login hardening + Seller/Payout rules

## Completed

- Hardened Google OAuth callback provisioning for new users.
- Added clear login error states for OAuth callback/account provisioning failures.
- Callback self-heals a missing profile and applies the current direct-EWU-email auto-Seller rule.
- EWU auto-Seller notification failure is non-fatal to account creation.
- Manual Seller verification no longer requires a bKash number.
- Free Resource uploads are allowed for verified Sellers without a bKash payout number.
- Paid Resource upload/publish is blocked server-side until a valid bKash payout number exists.
- Free-to-paid pricing changes are covered by the same server-side rule because the upload API checks the final pricing type.
- Payment Settings and Seller onboarding now explain the bKash purpose in simple Bangla and explicitly warn users never to enter bKash PIN/OTP/password.
- Existing legacy `seller_bkash_number` values remain recognized as payout-ready for compatibility.

## Product rule

```text
Random Google email
  -> Student
  -> Seller verification
  -> Seller

New qualifying EWU Google email
  -> Auto Seller

Seller + Free Resource
  -> Upload allowed without bKash

Seller + Paid Resource + no bKash
  -> Blocked

Seller + Paid Resource + valid bKash
  -> Upload allowed
```

## Validation

- `node scripts/verify-project.mjs` -> PASS
- `node scripts/production-audit.mjs` -> PASS
- Fresh `npm ci` could not complete in the sandbox because dependency installation timed out, so a fresh TypeScript/build run is still required on the owner's machine.

## Required Supabase action

Apply:

`supabase/migrations/0049_seller_payout_requirements_and_oauth_hardening.sql`

Live OAuth and database behavior should then be tested with:

1. Existing Google account.
2. New non-EWU Google account.
3. New qualifying EWU Google account.
4. Verified Seller uploading a Free Resource without bKash.
5. Same Seller selecting Paid without bKash (must be blocked).
6. Add bKash and publish Paid Resource (must be allowed).
