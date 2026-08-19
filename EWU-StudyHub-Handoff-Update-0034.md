# EWU StudyHub — Handoff Update 0034

## Date
2026-08-19

## Confirmed User Changes Implemented

### 1. Back button loop fix
- Reworked the shared `BackButton` navigation logic.
- The app now keeps a bounded session navigation stack instead of relying directly on `router.back()`.
- Back navigation removes the current entry and moves to the previous unique in-app route.
- Query strings are included in the tracked route key.
- A safe `/` fallback is used when no previous in-app route exists.
- This is intended to prevent the previous-page loop behavior reported by the user.

### 2. Home page departments
- Removed the Home page hard limit that previously used `.slice(0, 6)`.
- The Home Departments section now renders all fetched departments, ordered by published resource count and then department name.
- The existing `/departments` page remains available through the All departments link.

### 3. Course/Admin card text layout
- Course cards now allow long course names and bottom labels to wrap more safely instead of being squeezed/clipped.
- Course titles use `break-words` and the content area can grow naturally.
- Admin upload-review cards now give their text column flexible width and allow long titles/seller text to wrap.
- Admin resource/user cards were adjusted so the main text column remains flexible and long content does not collide with action buttons.
- Admin report review cards now wrap long resource/report text instead of overflowing.

### 4. Remove browser prompt
- Removed the global `InAppBrowserHint` from the root layout.
- Deleted the unused `src/components/shared/in-app-browser-hint.tsx` component.
- The site will no longer show the “Open StudyHub in your browser” prompt/message.

### 5. Theme system — 3 themes only
Confirmed order and names:
1. **Royal Blue** (`ewu-blue`)
2. **Rose** (`pink`)
3. **Dark** (`dark`)

Changes:
- Removed Light from the theme selector.
- Root `ThemeProvider` now exposes only these three themes.
- Default theme changed from Light to Royal Blue.
- Existing stored `light` selections are automatically migrated to `ewu-blue` when the theme control mounts.
- Theme selector labels are now the requested premium names: Royal Blue, Rose, Dark.

## Files Changed
- `src/components/navigation/back-button.tsx`
- `src/app/page.tsx`
- `src/components/courses/course-card.tsx`
- `src/components/admin/upload-review-card.tsx`
- `src/components/admin/report-review-card.tsx`
- `src/app/admin/resources/page.tsx`
- `src/app/admin/users/page.tsx`
- `src/components/shared/theme-toggle.tsx`
- `src/app/layout.tsx`
- Removed: `src/components/shared/in-app-browser-hint.tsx`

## Validation
Source-level checks performed:
- Confirmed Home page no longer contains the six-department slice.
- Confirmed no Light option remains in the theme selector/provider configuration.
- Confirmed the browser prompt component is no longer imported or rendered.
- Confirmed the three requested theme labels/order are present.

Environment limitation:
- `npx tsc --noEmit` could not complete because the ZIP's bundled `node_modules` is incomplete and missing type-definition packages (`json5`, `node`, `prop-types`, `react`, `react-dom`).
- `npm run build` could not run because the bundled environment does not contain the `next` executable.
- No claim of full production build/type validation is made in this update.

## Current Focus
- User should visually verify the five requested UI/navigation changes on desktop and mobile.
- Next implementation should start from this Update 0034 state and preserve all existing preview/security work.
