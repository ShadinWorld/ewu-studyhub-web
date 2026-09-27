# UX Update — Compact Dashboard, Home Hero and Mobile Footer (2026-09-27)

## Scope
Approved UI-only refinement for the Home page, Student/Seller dashboard header, mobile footer, and mobile bottom navigation.

## Implemented
- Student and Seller dashboard headers now use one compact reusable greeting component instead of role-specific hero/workspace cards.
- Dashboard greeting uses the browser's local time and updates every minute so `Good morning`, `Good afternoon`, `Good evening`, and `Good night` match the user's device time rather than the Vercel server timezone.
- Removed the dashboard header's secondary message, date, availability badge, and role/workspace label from the top greeting area. Existing dashboard quick actions, activity, stats, notifications, uploads, purchase and payout logic remain unchanged.
- Home hero copy is now intentionally minimal and global:
  - `Upload. Share. Earn.`
  - `Turn your academic resources into value.`
- Home search remains the primary action directly under the short message.
- Removed the extra `Built for EWU students` badge from this compact Home hero area.
- Mobile footer is now compact by default with three native expandable groups: `Explore`, `Community`, and `Legal & trust`.
- Mobile footer keeps a small StudyHub/support row and compact community/copyright line.
- Desktop footer layout is preserved.
- Mobile bottom navigation height, icon size, and page bottom spacing were reduced while retaining the existing five routes and active-state behavior.

## Data / Security
- No database, API, auth, storage, seller-finance, upload, purchase, or RLS changes.
- No new migration required.
- No new data source introduced.

## Validation
- `npm run verify` — PASS.
- `npm run production-audit` — PASS.
- `npx tsc --noEmit` could not complete in the sandbox because the dependency installation timed out and left required `@types/*` packages unavailable. A complete local TypeScript/build run is still required before production release.
- No production deployment was performed from this artifact.

## Manual QA focus
- Compare Student and Seller dashboard at 360/390/412px and desktop.
- Confirm greeting follows device local time through morning/afternoon/evening/night and updates after crossing an hour boundary while the page remains open.
- Confirm Home hero remains visually short and the search field stays prominent.
- Expand each mobile footer group and confirm all existing links still work.
- Confirm mobile bottom navigation does not cover page content or overlap Ask AI/back-to-top controls.
