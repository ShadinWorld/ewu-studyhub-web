# EWU StudyHub — Handoff Update 0041

## Date
2026-08-21

## Scope completed
Implemented the confirmed **full Homepage Banner / Campaign System** (Phase 1 + Phase 2 + Phase 3, all 22 requested items) on top of the current EWU StudyHub source.

### Homepage banner experience
- Replaced the old small announcement-card homepage block with a **giant top-of-homepage hero banner carousel**.
- Banner appears before the normal homepage hero/search content so it is the first major visual element.
- Responsive mobile-first layout with large desktop hero sizing and touch swipe support.
- Auto rotation, previous/next controls, pagination dots, pause-on-hover, and smooth fade/slide-style motion foundation.
- Separate mobile image upload with desktop-image fallback.
- Strong image readability overlay for text over arbitrary artwork.

### Admin banner manager
- New **Homepage Banner Manager** inside Admin → Academic Tools.
- Admin can create, edit, preview, reorder, search/filter, hide and delete banners.
- Drag-and-drop banner ordering.
- Draft / Scheduled / Published / Hidden states, with live/scheduled/expired display status derived from dates.
- Start/end scheduling.
- Audience targeting: Everyone, Students, Sellers, Admins.
- Department targeting and course targeting.
- Banner max-visible, autoplay, rotation interval, dots/arrows, and transition settings are configurable **per audience**.
- Preview modal includes desktop and mobile previews.
- Smart CTA destination selector with a Custom URL fallback.
- Predefined badge choices.
- Optional dismissal and display-frequency controls: every visit, once per session, once per day.
- Banner alt text for accessibility.

### Personalization / advanced targeting
- Supports `{{first_name}}` and `{{department_name}}` tokens in banner title/message.
- Course targeting uses the visitor's most recently selected StudyHub course preference.
- Course detail pages now persist the last viewed course preference locally for relevant homepage campaigns.

### Analytics
- Aggregate impression and click counters on each banner.
- Daily banner analytics table for the last 30 days.
- Admin analytics view surfaces impressions, clicks and CTR plus recent 30-day campaign activity.

### Storage / database
- Added `homepage-banners` public storage bucket for admin-managed hero artwork.
- Added `homepage_banner_settings` table.
- Extended `announcements` with audience, mobile artwork, status, ordering, frequency, targeting and analytics fields.
- Added `announcement_daily_stats` table.
- Added secure audience-aware announcement RLS helper/policy.
- Added RPCs for impression/click tracking.
- Extended storage orphan scan to recognize homepage banner assets.

## Main files changed / added
- `supabase/migrations/0027_homepage_banner_campaign_system.sql`
- `src/components/admin/homepage-banner-manager.tsx`
- `src/components/homepage/homepage-banner-carousel.tsx`
- `src/components/homepage/course-preference-tracker.tsx`
- `src/app/api/announcements/impression/route.ts`
- `src/app/api/announcements/click/route.ts`
- `src/app/admin/academic-tools/page.tsx`
- `src/app/admin/academic-tools/actions.ts`
- `src/app/page.tsx`
- `src/app/course/[courseId]/page.tsx`
- `src/types/database.types.ts`

## Validation
- Source syntax for the newly added TS/TSX files was checked with the installed global TypeScript parser; no TS syntax diagnostics were emitted for the new files.
- Full `npm run type-check` / production build could not be completed because the uploaded project dependency tree is incomplete in this environment (Next/React/Supabase packages are not fully installed and offline dependency restore is unavailable).
- The implementation should be validated after restoring dependencies with:
  - `npm ci`
  - `npm run type-check`
  - `npm run build`
- Supabase must run migration `0027_homepage_banner_campaign_system.sql` before testing banner uploads/analytics/targeting end-to-end.

## Product behavior notes
- Existing legacy `announcements` rows without an image remain compatible at the database level, but the new hero manager expects new campaigns to use the required desktop banner image.
- Audience-specific campaigns are protected by server-side audience-aware RLS as well as homepage filtering.
- Course-targeted campaigns are intentionally based on a lightweight local course preference to avoid inventing a new enrollment model.

## Next focus
Run the real Supabase migration, restore dependencies, perform desktop/mobile browser QA, then verify each audience and scheduled-banner path end-to-end.
