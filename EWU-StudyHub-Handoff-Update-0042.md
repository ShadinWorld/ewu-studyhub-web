# EWU StudyHub — Handoff Update 0042

## Date
2026-08-21

## Scope completed
Fixed the TypeScript errors reported after running `npx tsc --noEmit` against the Homepage Banner / Campaign System implementation from Update 0041.

### TypeScript fixes
- Added a strict `BannerStatus` union for homepage banner create/update actions:
  - `draft`
  - `published`
  - `scheduled`
  - `hidden`
- Removed the unsafe generic `string` inference for banner status before Supabase insert/update.
- Added safe fallback to `draft` for unexpected form status values.
- Fixed homepage banner settings lookup for unauthenticated visitors: `guest` is now mapped to the valid `all` audience before querying `homepage_banner_settings`.
- This addresses the two errors reported by the user's local `npx tsc --noEmit` run in:
  - `src/app/admin/academic-tools/actions.ts`
  - `src/app/page.tsx`

### Supabase SQL fix included
- Fixed migration `0027_homepage_banner_campaign_system.sql` by renaming the PL/pgSQL variable `current_role` to `v_current_role` to avoid the SQL parser error reported in Supabase SQL Editor.

## Files changed
- `src/app/admin/academic-tools/actions.ts`
- `src/app/page.tsx`
- `supabase/migrations/0027_homepage_banner_campaign_system.sql`
- `EWU-StudyHub-Handoff-Update-0042.md`

## Validation
- Confirmed the exact failing expressions from the user's `npx tsc --noEmit` output were replaced with type-safe implementations.
- Local ZIP environment does not contain a complete `node_modules/.bin/tsc`, so a fresh TypeScript build could not be executed inside this environment.
- User should run after extracting/replacing the updated project:
  - `npm install` or `npm ci`
  - `npx tsc --noEmit`
  - `npm run build`
- The corrected SQL migration should be pasted/run in Supabase when applying migration 0027.

## Current handoff state
Homepage Banner / Campaign System remains at the Update 0041 feature scope (all 22 requested items), with these follow-up type/SQL fixes applied in Update 0042.
