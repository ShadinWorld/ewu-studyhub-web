# Email confirmation removed from signup

## Supabase Dashboard setting (do this first — the code alone doesn't disable it)
Authentication → Sign In / Providers → **Email** → turn **OFF** "Confirm email" → Save.

## What changed in code
- `src/app/(auth)/actions.ts`
  - `signupAction` no longer sets `emailRedirectTo` — with confirmation off,
    `supabase.auth.signUp()` returns an already-active session, so the
    person is logged in immediately and redirected straight to `/` (the
    homepage). No email is sent at all.
  - `resendConfirmationAction` removed (nothing to resend anymore).
- `src/app/(auth)/verify-email/page.tsx` — simplified. This page is no
  longer part of the normal signup flow; it only shows up as a fallback if
  someone tries to log into an **old** account that was created before you
  turned confirmation off and was never confirmed (`loginAction` still
  redirects there in that one case). Those old accounts need to be
  confirmed manually: Supabase → Authentication → Users → open the user →
  there's usually a "Confirm email" action, or delete and have them sign
  up again.

## What this means going forward
- New signups: instant, no email, no Resend/SMTP dependency at all for
  the signup flow.
- Real verification stays exactly as your app already describes it:
  anyone can browse/buy with any email, and *becoming a seller* still
  requires the student ID upload + admin review — that part is untouched.
- `forgotPasswordAction` (password reset) still sends an email — that's
  unavoidable with Supabase, but it's a much rarer path than signup and
  wasn't the source of your testing pain.

## How to apply
1. Do the Supabase Dashboard toggle above.
2. Copy the two files in this zip over your project at the same paths.
3. Restart `npm run dev` and try a fresh signup — should land you on the
   homepage immediately, already logged in.
