# Backup & Restore Runbook (Free Path)

## Keep a recovery package
At each meaningful milestone keep: project ZIP (without `node_modules`/`.next`), `package-lock.json`, `.ai/`, and a copy of the current Supabase schema/migration history.

## Supabase backup routine
1. Open Supabase SQL Editor.
2. Export/copy the current schema SQL or use the dashboard export available on the free plan.
3. Preserve numbered migration files; do not rename applied migrations.
4. Record the live migration state in `.ai/EWU-STUDYHUB-HANDOFF.md`.

## Restore routine
1. Create a fresh Supabase project if the original is unavailable.
2. Apply migrations in order, checking historical duplicate sequence numbers manually.
3. Recreate Storage buckets and policies documented by the migrations.
4. Set environment variables in the local/Vercel environment.
5. Run `npm install`, `npx tsc --noEmit`, `npm run build`, and `npm run verify`.
6. Run the smoke-test checklist in `docs/PRODUCTION_READINESS.md`.

## Secrets
Never put `.env.local`, service-role keys, passwords or private tokens in the ZIP, GitHub or `.ai` documentation.
