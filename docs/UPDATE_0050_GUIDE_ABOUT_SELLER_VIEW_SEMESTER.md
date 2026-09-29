# Update 0050 — Guide, About, Seller Verification, View Tracking and Semester Badges

## Scope
Approved implementation covering the User Guide/content refresh, public About story, manual Seller verification bKash removal, Resource view-count tracking, and Semester/Year badges on Resource cards.

## User Guide
- Kept the existing database-driven `guide_sections` / `guide_overview_items` and Admin content controls.
- Rewrote the published Guide into action-first, conversational Bangla with English product/technical terms where useful.
- Added a concise `EWU StudyHub কী?` intro at the top of the Guide.
- Added a `Read the Full Story` action that opens `/about`.
- Archived redundant legacy Guide sections so the same workflow is not explained repeatedly.
- Added focused `Resource Request` and `Academic Tools` sections.
- Consolidated Seller finance guidance into `Earnings & Payout`.
- Consolidated Admin guidance into a single `Admin` section.
- Kept only one explicit `Ask AI for Help` CTA at the end of the Guide.

## About page
- Added public `/about` page containing the full StudyHub story, marketplace purpose, Student/Creator/Seller model, earning flow, feature overview and semester-to-semester value proposition.
- Did not add an About link to the header.
- Added `About EWU StudyHub` to the footer Explore group so the full story remains easy to discover.

## Manual Seller verification / bKash
- Removed bKash number input and validation from the manual `Become a Seller` form.
- The server action now submits an empty `p_bkash_number` value to the existing optional-bKash verification RPC; the database function normalizes this to null.
- Seller verification remains based on EWU email + student ID document + Admin review.
- Existing bKash requirements for Paid Resource publishing / Earnings / Payout remain unchanged.

## Resource view tracking
- Removed `increment_view_count` and `resource.view` activity writes from the Server Component render path.
- Added a dedicated client `ResourceViewTracker` that sends one tracking request per resource per 30-minute browser session window.
- Added `/api/files/[id]/track-view` to increment the atomic DB counter and update authenticated-user `recently_viewed`/activity records only for published resources.
- This prevents RSC re-renders/revalidation from increasing views every second or multiple times for the same page render.

## Resource card Semester / Year badge
- Added optional `semester` and `year` fields to `ResourceCardData`.
- `ResourceCardGrid` reads the authoritative `files.semester` / `files.year` metadata before rendering cards, so all existing ResourceCardGrid usages receive the badge without duplicating query logic.
- Published examples render as `Spring 26`, `Summer 26`, `Fall 25`.
- Missing metadata is left blank rather than inventing a label.

## Validation target
- TypeScript: run `npm run type-check` locally.
- Project verification: run `npm run verify`.
- Production audit: run `npm run production-audit`.
- Production build: run `npm run build` locally before release.
- Manual QA: Guide/`/about`, Seller verification without bKash, View Count stability across refresh/RSC navigation, and Semester/Year badges on desktop/mobile.
