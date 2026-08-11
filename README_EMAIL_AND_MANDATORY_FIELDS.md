# 1. New-account email flow — link instead of OTP code

## New flow
1. Signup → Supabase sends its **default** "Confirm signup" email (a click
   link — no code to type, no custom email template edits needed anymore).
2. Person clicks the link → hits `/api/auth/callback` → email gets marked
   confirmed → **immediately signed back out** → redirected to
   `/login?confirmed=1` (shows a green "Email confirmed — you can log in
   now" banner).
3. Person types their password → `loginAction` → redirected to **`/`**
   (the homepage), not `/dashboard`.

No OTP code anywhere in this flow anymore.

## Why "sign back out" in the callback route
Supabase's code-exchange (`exchangeCodeForSession`) creates a session as a
side effect of confirming the email — which would silently auto-login the
person. Since you asked for "confirm → login page → must log in", the
callback route now calls `supabase.auth.signOut()` right after confirming,
so a password is always required.

## Files changed
- `src/app/(auth)/actions.ts` — `signupAction` now sets `emailRedirectTo`;
  `verifyOtpAction` removed, replaced by `resendConfirmationAction`;
  `loginAction` now redirects to `/` on success (was `/dashboard`)
- `src/app/(auth)/login/page.tsx` — shows the "Email confirmed" banner
- `src/app/(auth)/verify-email/page.tsx` — no more 6-digit code form, now
  just a "check your inbox" screen with a resend button (URL unchanged,
  still `/verify-email`, just different content)
- `src/app/api/auth/callback/route.ts` — signs out right after confirming

## ⚠️ One Supabase Dashboard setting to check
Since this now uses the **default** confirmation email (not the custom
`{{ .Token }}` OTP template from before), if you'd previously edited the
"Confirm signup" template in Supabase for the OTP flow, you may want to
reset it back to Supabase's default template (or make sure it still
contains `{{ .ConfirmationURL }}`) — Authentication → Email Templates →
Confirm signup.

Also confirm your Supabase project's **Redirect URLs** allow-list
(Authentication → URL Configuration) includes:
```
http://localhost:3000/api/auth/callback
```
(and your production URL once deployed) — Supabase rejects
`emailRedirectTo` values not on this list.

---

# 2. Course selection is now mandatory

- **UI:** the Course dropdown placeholder changed from "Select course
  (optional)" to "Select course", and the field now has `required` — the
  browser blocks submission until a real course is picked (still stays
  disabled until a Department is chosen first, per the earlier fix).
- **Server:** `courseId` and `departmentId` in `src/lib/validations.ts`
  (`uploadFileSchema`) were `.optional()` — removed, so even a direct API
  call bypassing the form gets rejected without a valid course/department.
- **Category** ("Notes" / "Mid Questions" / etc.) was **already
  mandatory** — it's a `required` `<select>` with no blank option, so it
  always carries a value, and the server schema already had no
  `.optional()` on it. No change needed there.

## Files changed
- `src/components/upload/upload-form.tsx`
- `src/lib/validations.ts`

## How to apply
Copy all files under `src/` in this zip over your project at the same
paths, then restart `npm run dev`.
