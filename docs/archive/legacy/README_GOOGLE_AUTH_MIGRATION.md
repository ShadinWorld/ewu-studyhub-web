# EWU StudyHub — Google-only Authentication + EWU Verification

This patch changes authentication to:
- Continue with Google only
- Google name, email and profile photo
- Phone number required before account access
- Existing verified email/password users are preserved; Supabase Auth can automatically link a Google identity with the same verified email
- Seller verification requires EWU student email + ID-card photo + bKash number
- Admin reviews the ID-card image and EWU email, then approves/rejects
- Authorized admin accounts can switch via Google account selection
- Legacy username and password-recovery UI/code removed

## 1. Run the SQL first

Run:
`supabase/migrations/0017_google_auth_ewu_verification.sql`

Do NOT run this blindly against another project. It assumes the existing EWU StudyHub schema.

## 2. Configure Google in Supabase

Supabase Dashboard → Authentication → Providers → Google → Enable.

Create a Google OAuth Web Client in Google Cloud.

Google Authorized JavaScript origins:
- `http://localhost:3000`
- `https://ewu-studyhub-web.vercel.app`

Google Authorized redirect URI:
- Use the callback URI shown by Supabase on the Google provider page. For this project it should be the Supabase Auth callback, not the Next.js `/api/auth/callback` route.

Supabase Authentication → URL Configuration:
- Site URL: `https://ewu-studyhub-web.vercel.app`
- Redirect URLs:
  - `http://localhost:3000/api/auth/callback`
  - `https://ewu-studyhub-web.vercel.app/api/auth/callback`

The application callback exchanges the OAuth code for the Supabase session.

## 3. Environment

Keep:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

For production:
`NEXT_PUBLIC_SITE_URL=https://ewu-studyhub-web.vercel.app`

Never expose the service-role key in client code.

## 4. Test order

1. `npm install`
2. `npx tsc --noEmit`
3. `npm run build`
4. Start local dev.
5. Open `/login`.
6. Click Continue with Google.
7. New user must be sent to `/account` and cannot browse until a phone number is saved.
8. Existing account with the same verified email should retain its existing profile/resources/purchases when Google is used.
9. Become a seller: submit EWU email + ID-card image + bKash.
10. Admin → Seller Requests → View ID card → Approve/Reject.
11. Admin profile switcher → choose another authorized admin → Google account selection → returns to `/admin`.

## Important

The app does not store any Google or EWU password. Google manages the login credential. Seller verification checks ownership/details manually through the EWU email + ID-card evidence.
