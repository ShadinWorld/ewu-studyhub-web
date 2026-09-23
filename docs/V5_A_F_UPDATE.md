# EWU StudyHub — V5 A–F Update

Date: 2026-09-23

## Scope
This update covers only the approved A–F scope:

A. Dashboard visual polish
B. Pre-upload file preview
C. Global contextual Help
D. Back-to-top control
E. Draggable Ask AI widget
F. PWA/app icon refresh

Android packaging, role-name changes and migration renumbering are intentionally outside this update.

## A — Dashboard
`AdaptiveQuickActions` now gives every known Student/Seller quick action a semantic color treatment. Previously neutral lower-row actions such as Departments, Trending, Help & Support and Become a Seller now have explicit color variants. Cards also use a low-intensity sheen, hover lift and tap feedback. `prefers-reduced-motion` disables the sheen animation.

Admin dashboard Quick Links now use a matching semantic color language.

## B — Pre-upload Preview
Selected upload files are now clickable. Clicking a file opens `FilePreviewModal` before upload/storage submission.

Supported local verification paths:
- PDF: PDF.js document viewer inside the modal, with page navigation limited to the first few verification pages.
- DOCX: local Quick Preview.
- PPTX: local Slide Preview.
- Images: local image preview.
- Legacy DOC/PPT: explicit conversion recommendation.

The selected File object remains local until the seller submits the form.

## C — Contextual Help
`ContextualHelp` is globally mounted from the root layout. It maps common route prefixes to existing Admin-managed `help_items` slugs. The existing `InfoButton` remains the rendering/editing contract; no separate help content store was introduced.

Pages with a dedicated help slug use that item. Pages without a dedicated slug fall back to general onboarding help.

## D — Back to top
A global `BackToTopButton` appears after scrolling beyond a threshold and returns the user to the top with smooth scrolling. Its position is above the mobile bottom-navigation area.

## E — Ask AI draggable launcher
The StudyHub Assistant launcher now supports pointer/touch dragging. Position is clamped inside the viewport and persisted in `localStorage`. The default position remains the existing lower-left location. The home dialog includes a reset-position control.

## F — PWA icon
The PWA icon set was refreshed with a dedicated StudyHub academic mark. Updated assets:
- `/public/icons/icon-192.png`
- `/public/icons/icon-512.png`
- `/public/icons/apple-touch-icon.png`

`manifest.ts` and root metadata now reference the refreshed icon set.

## Validation
- `node scripts/verify-project.mjs` — PASS
- `node scripts/production-audit.mjs` — PASS
- Global TypeScript transpile/syntax check of 10 modified TS/TSX files — PASS
- Fresh `npx tsc --noEmit` could not complete because the sandbox dependency install timed out and left an incomplete type-definition tree.
- Fresh production build could not be completed for the same dependency-install limitation.

## Known limitations
- PDF.js continues to load from the existing CDN runtime path.
- Contextual Help reuses current `help_items` slugs; no new database migration was introduced.
- Historical duplicate migration numbers remain unchanged by design.
