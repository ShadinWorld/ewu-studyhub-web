# Dashboard UX — Adaptive Quick Actions (2026-08-28)

## Goal
Make Student and Seller dashboards feel like personalized workspaces instead of static shortcut lists while preserving existing routes and data sources.

## Implemented
- Quick Actions are displayed above activity/stat sections on Student and Seller dashboards.
- Both roles use a responsive 3-column action grid on mobile and desktop.
- Cards use subtle depth, compact icon badges and short labels instead of heavy 3D/emoji decoration.
- Student actions include Browse resources, Purchases, Saved, Requests, Notifications, Student Tools, History, Courses and Profile.
- Seller actions include Upload, Sales & earnings, Notifications, Payment settings, Purchases, Requests, Student Tools, History and Profile.
- Action order adapts from real `dashboard.quick_action` usage recorded in `user_activity_history`.
- Usage scoring combines frequency and recency; important primary actions receive a small baseline preference.
- First-time users fall back to the curated default order.
- Action tracking is fire-and-forget and never blocks navigation.
- Added a dynamic time-based greeting and context-aware secondary message to both dashboards.
- Added a Student "Continue" card for the latest purchased resource when available.
- Activity/stat cards now use a subtle elevated visual treatment.

## Data / Security
- Reuses the existing `record_user_activity` security-definer RPC.
- No new migration is required.
- The tracking API accepts only an allowlist of known internal dashboard actions and only same-origin relative paths.
- The activity query is scoped to the authenticated user through existing RLS.

## Validation
- Changed TSX/route files passed TypeScript transpile/syntax validation in the development sandbox.
- Full `npx tsc --noEmit` and production build require the user's dependency-complete environment.

## UX intent
- Frequent actions naturally rise toward the top over time.
- Low-use actions remain available but move lower in the grid rather than disappearing.
- The dashboard should feel current through context-aware messaging without becoming noisy.
