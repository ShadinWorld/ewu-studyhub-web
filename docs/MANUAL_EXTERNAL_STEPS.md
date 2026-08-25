# EWU StudyHub — Manual External Steps (Free-Only)

These steps require access to the owner's external dashboards or real devices. They are intentionally not automated by the project source.

## 1. Supabase
1. Open Supabase → SQL Editor.
2. Apply any not-yet-applied migrations in order, especially `0028_homepage_banner_duration_mode.sql`, `0029_transparency_homepage_quick_actions.sql`, `0030_quick_attention_customization.sql`, and `0031_transparency_activity_events.sql`.
3. Verify `homepage_banner_settings`, `platform_response_time_settings`, `homepage_quick_actions`, `homepage_quick_attention`, `homepage_section_settings`, and `activity_events` exist.
4. Verify `homepage-banners` and private resource buckets/policies.
5. Never paste secrets into project documentation or ZIPs.

## 2. Local verification
From the project root:

```powershell
npm install
npx tsc --noEmit
npm run build
npm run verify
npm run production-audit
```

`tsc` and `build` must pass before release. `verify` and `production-audit` are no-cost static gates.

## 3. Vercel
1. Connect/deploy the GitHub `master` branch.
2. Configure the same environment variable names as local development, without committing their values.
3. Open the deployed site and perform the smoke-test list in `docs/QA_E2E_MATRIX.md`.

## 4. GitHub
The `.ai/` folder is intentionally ignored by `.gitignore`. Keep it in the local/ZIP project package but do not publish it.

Typical push:

```powershell
git status
git add .
git commit -m "Update project"
git push origin master
```

## 5. Real-device acceptance
Test at minimum on a phone and desktop browser:
- Logged-out header / Login / Sign up
- Giant Hero carousel
- Admin 3×3 Quick Actions and Quick Attention
- Homepage section minimize/restore
- Course search / upload autofill
- Own-resource View/Download without Buy
- Buyer purchase / request timeline
- Seller sale / payout visibility
- Admin Pending Work filters
- Notifications / Requests

## 6. Backups
Before high-risk database changes, keep a schema/migration snapshot and the latest source ZIP. Use `docs/BACKUP_AND_RESTORE.md` for the restore sequence.
