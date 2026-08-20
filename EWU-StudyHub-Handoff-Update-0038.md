# EWU StudyHub — Handoff Update 0038

Date: 2026-08-20

## Confirmation / scope
User explicitly confirmed the following after review:
- Fix mobile navigation/header behavior and perform a broader mobile UI pass.
- Provide a logo-generation prompt for Gemini (stored in `LOGO_GENERATION_PROMPT.md`).
- Place Buy / Preview actions before “About this resource” on mobile, in a highly visible location; retain sticky mobile actions.
- Make cross-user UI updates happen without manual refresh for admin, seller and student actions where the changed data is relevant and permitted.
- Make homepage Student Tools more compact on mobile.
- Show file type (PDF/PPT/IMAGE/etc.) clearly on resource cards.
- Keep Find your course, Department and Course fields synchronized both ways.
- Additional confirmed recommendations: sticky Buy/Preview, compact mobile header, collapsible/compact content strategy, and responsive audit targets 360/390/412 widths.

## Implemented in this update
### 1. Realtime synchronization foundation
- Added `src/components/shared/realtime-sync-provider.tsx`.
- Wrapped the app in `RealtimeSyncProvider` from `src/app/layout.tsx`.
- Subscribes to relevant Supabase tables using Postgres Changes and calls debounced `router.refresh()` on relevant events.
- Public content sources: `files`, `courses`, `departments`, `announcements`, `academic_documents`, `deadlines`.
- User-scoped sources: `notifications`, `purchases`, `resource_requests`, `profiles`; seller payout events; seller purchase activity; admin broader operational events.
- Also refreshes on browser focus to recover from temporarily missed socket events.
- No client-side sensitive payload is exposed beyond existing RLS; the provider only triggers revalidation.

### 2. Realtime database publication
- Added `supabase/migrations/0026_enable_realtime_sync.sql`.
- Migration safely adds relevant public tables to the `supabase_realtime` publication only when not already present.

### 3. Resource card file-type labels
- Added optional `file_kind` to `ResourceCardData`.
- Updated resource queries/maps to carry `file_kind` into cards where resource grids are used.
- Resource cards now show a clear file-type badge at the image bottom-right (PDF, PPT, IMAGE, etc.).

### 4. Mobile resource actions
- Added an inline mobile Quick Action block immediately before “About this resource”.
- Existing sticky bottom resource actions remain for persistent access while scrolling.

### 5. Mobile homepage / tools cleanup
- Homepage Student Tools heading changed from the old “More than a resource marketplace” wording to **Study Essentials**.
- Student tools are now a compact 2-column mobile grid to reduce vertical space.
- `/tools` page also uses a compact 2-column mobile grid.
- Mobile bottom navigation was tightened slightly and kept touch-friendly.
- Main header was made more compact on mobile without restoring desktop navigation links at mobile widths.
- Resource descriptions are now collapsible via native `<details>` so long content takes less vertical space on phones.

### 6. Course field synchronization
- Manual Department changes now also clear stale Course / Find your course state when the selected course no longer belongs to that department.
- Manual Course selection updates the Find your course field with the course code.
- Search-based exact course matches continue to auto-select Department + Course.

### 7. Logo prompt artifact
- Added `LOGO_GENERATION_PROMPT.md` for Gemini logo generation, explicitly requiring an original logo and avoiding reproduction of EWU protected branding.

## Files added / updated
- `src/components/shared/realtime-sync-provider.tsx`
- `src/app/layout.tsx`
- `src/components/files/resource-card.tsx`
- `src/components/layout/navbar.tsx`
- `src/components/navigation/mobile-bottom-nav.tsx`
- `src/app/page.tsx`
- `src/app/tools/page.tsx`
- `src/app/files/[id]/page.tsx`
- `src/components/upload/upload-form.tsx`
- resource-grid query/map files carrying `file_kind`
- `supabase/migrations/0026_enable_realtime_sync.sql`
- `LOGO_GENERATION_PROMPT.md`
- this handoff file

## Incidental build validation fix
- The latest uploaded source still contained the previously reported invalid `payout.status === "rejected"` comparison in `src/app/requests/page.tsx`; removed that impossible comparison so production type-checking can proceed against the current database type.

## Validation
- Static source inspection completed after edits.
- Full `npm run build` / `npm run type-check` should be run locally after dependency restore.
- Realtime functionality requires the migration to be applied to the connected Supabase project and the normal Supabase Realtime service to be enabled.
- Responsive validation targets: 360x800, 390x844, 412x915.

## Next session rule
Read `00_AI_START_HERE.md` when present, then the latest handoff and AI master context before making changes. Do not implement new work without explicit user confirmation. Update the handoff after every approved implementation.
