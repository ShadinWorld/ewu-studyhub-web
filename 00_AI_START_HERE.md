# EWU StudyHub — AI Start Here

This is an existing production-oriented project. The latest source code and current Supabase migrations are the technical source of truth.

## Mandatory workflow
1. Read this file.
2. Read the latest `EWU-StudyHub-Handoff-Update-*.md` file and `EWU-StudyHub-AI-Master-Context-*.md` file before making decisions.
3. Inspect the current source/schema for the requested feature; do not guess old tables, routes, types, or APIs.
4. **Do not implement, edit, delete, migrate, or generate project changes until the user explicitly confirms the proposed work.** Analysis/recommendations are allowed before confirmation.
5. After explicit confirmation, implement only the confirmed scope and preserve existing working features.
6. After every approved implementation, create/update the newest handoff file with: scope, files changed, behavior, security considerations, validation result, and next focus.
7. Never restore removed Prerequisite Checker or Grade Calculator unless explicitly requested.
8. Never treat an old handoff as newer than the latest source.

## Continuity rule
The user may move this project between ChatGPT accounts. The ZIP must be sufficient for the next AI session to continue without requiring the user to repeat these workflow rules manually.

## Update 0065 — Global User Guide header visibility
- Made the primary User Guide control consistently visible in the global site header for Guest, Student, Seller, and Admin sessions.
- Mobile header shows a compact but labeled `Guide` button instead of icon-only treatment, while larger screens show `User Guide`.
- Added a subtle primary tint, stronger typography, rounded shape, and accessible `title` so first-time users can discover the Guide without crowding the header.
- Reduced header control gap slightly to preserve 360px/390px/412px mobile fit.


## Update 0058 — Final manual-QA fixes (2026-08-22)
- Removed the Home page `Reset layout` control from the visible homepage UI.
- Reworked free/paid resource downloads to stream the authorized private file through the download route with `Content-Disposition: attachment`, so Download triggers an actual file download instead of opening the browser PDF viewer.
- Replaced the seller bKash save action's dependency on the legacy RPC with an authenticated server-side admin upsert after a seller-role check; success/error feedback is returned on the Payment Settings page.
- Made Seller Home's Upload action a clear green primary action.
- Replaced full-page Resource Request detail navigation with an in-place modal/details panel, eliminating the forced page refresh and scroll-to-detail problem.
- Added a dedicated Admin Student Tools → Resource Requests page so that resource-request management stays inside the Student Tools section instead of redirecting to the large Academic Tools page.
- Added migration `0038_fix_payout_completion_balance.sql` to fix automatic payout completion rejecting the very payout currently being approved because the balance calculation counted that pending payout against available funds.
- Added friendly payout success/error feedback on the Admin Payouts page.
- Live action required: apply migration `0038_fix_payout_completion_balance.sql` before re-testing Admin payout completion.


## Update 0058 — Final manual-QA fixes (2026-08-22)
- Removed Home Reset layout control.
- Download route now streams authorized files with attachment disposition for reliable downloads.
- Seller bKash save now uses authenticated server-side upsert with visible success/error feedback.
- Seller Upload button is green.
- Admin Resource Request details now open in-place; Student Tools Resource Requests has a dedicated page.
- Migration 0038 fixes automatic payout completion balance calculation.
