# EWU StudyHub Security Audit — Free Baseline

## Protected resource controls
- Paid originals are stored in the private `files-private` bucket.
- `/api/files/[id]/view` checks auth/purchase or uploader ownership before issuing a signed URL.
- `/api/files/[id]/download` checks auth/purchase or uploader ownership before issuing a signed URL.
- Checkout action blocks uploader self-purchase server-side.
- Resource viewer allows uploader ownership and completed-purchase access; preview mode remains restricted for paid buyers who have not purchased.

## Admin controls
- Admin pages perform explicit role checks.
- Supabase RLS backs user/admin access boundaries.
- Homepage quick actions, quick attention and layout settings are admin-only at the database read layer after migration 0031.
- Admin activity is recorded in `audit_logs` for major settings and moderation actions.

## Sensitive data
Never place service-role keys, `.env.local`, passwords, private tokens, or payment credentials in GitHub, `.ai`, or the project ZIP.

## Manual attack checks
1. Open a paid resource as guest and try direct `/api/files/<id>/view` and `/api/files/<id>/download`.
2. Log in as a different student who has not purchased and retry.
3. Log in as the resource owner and verify view/download work without purchase.
4. Submit the checkout action as the owner and verify it is blocked.
5. Try a guessed/private storage path directly; access should remain denied.
6. Try a non-admin account against `/admin/pending` and admin settings.
7. Confirm admin-only homepage settings cannot be selected from the public client after migration 0031.

## Known limitation
Automated security testing against the live Supabase project requires the project owner to run the SQL migrations and local/deployed smoke tests. This package contains the code, migration and checklist but cannot execute the owner's external Supabase account actions.
