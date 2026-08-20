# EWU StudyHub — Handoff Update 0040

Date: 2026-08-20

## Confirmation / scope
User explicitly confirmed the storage-friendly custom preview approach for paid resources.

## Implemented
### 1. Custom browser-independent preview renderer
- Added `src/components/files/pdf-canvas-preview.tsx`.
- Paid preview pages are now rendered into `<canvas>` with PDF.js instead of embedding a browser-native PDF iframe.
- The preview renderer loads PDF.js in the browser from a CDN and uses the matching worker, avoiding the native PDF viewer that can behave inconsistently in Facebook in-app browsers and some external browser flows.
- Preview failures show a user-friendly retry state instead of a native “Open”/PDF viewer screen.

### 2. PDF preview behavior
- Paid PDF preview still exposes only the first 30% of pages through the existing secure `/api/files/[id]/preview/page/[pageNumber]` endpoint.
- The custom renderer shows those allowed pages as canvases.
- Locked pages remain application UI with purchase CTA; the original paid PDF is never sent to the preview renderer.
- The resource detail hero preview now renders only the first preview page to keep the page compact; the full preview viewer remains available through the dedicated viewer route.

### 3. Image preview behavior
- Paid image preview continues to expose only the top 30% of the image through the secure preview endpoint.
- The returned safe preview PDF is rendered through the same canvas viewer, so the user sees StudyHub's preview UI rather than a browser-native PDF viewer.
- Existing legacy `preview_storage_path` preview files remain supported.
- New paid image uploads no longer create a duplicate preview file in Supabase Storage.

### 4. Storage optimization
- New paid PDF uploads no longer store a separate preview PDF. The allowed preview pages are generated on demand from the private original by the existing preview-page endpoint.
- New paid image uploads no longer store a preview PDF. The top-30% preview is generated on demand from the private original.
- Free PDF/image behavior remains compatible with the existing reusable preview storage path where used.
- No destructive cleanup of legacy preview files was added in this update.

## Files added / updated
- `src/components/files/pdf-canvas-preview.tsx`
- `src/app/files/[id]/viewer/page.tsx`
- `src/app/files/[id]/page.tsx`
- `src/app/api/files/upload/route.ts`
- `src/app/api/files/[id]/preview/image/route.ts`
- this handoff file

## Security / access notes
- Paid originals remain in `files-private`.
- Preview endpoints continue to enforce publication, file-kind and purchase/access rules server-side.
- The custom renderer receives only the safe preview endpoint response for unpaid paid resources.

## Validation
- Source edits completed and reviewed statically.
- Full local TypeScript/build validation should be run in the user's environment after dependencies are installed.
- Because PDF.js is loaded in the browser, the next manual QA should include:
  - Chrome normal browser
  - Facebook in-app browser
  - 360x800, 390x844, 412x915 viewports
  - paid PDF preview
  - paid image preview
  - free resource viewer
  - purchased resource viewer

## Next session rule
Read `00_AI_START_HERE.md`, then the latest handoff and AI master context before making changes. Do not implement new work without explicit user confirmation. Update the handoff after every approved implementation.
