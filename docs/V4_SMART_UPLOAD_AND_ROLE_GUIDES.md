# EWU StudyHub V4 — Smart Upload & Role Guidance

## Scope

V4 improves the pre-upload verification experience and gives each role a structured, in-page onboarding guide.

## Pre-upload file preview

### Supported browser-side Quick Preview
- PDF: native browser object URL viewer.
- Image: local image object URL.
- DOCX: browser-side ZIP/XML text extraction for readable paragraph preview.
- PPTX: browser-side ZIP/XML extraction with slide-by-slide text Quick Preview.

The preview reads the selected file locally in the browser. It does not upload the file to Supabase merely to preview it.

### Legacy Office formats
`.doc` and `.ppt` are legacy binary Office formats. They are intentionally not converted through a third-party online viewer. The UI explains that sellers should save/export those files as `.docx` or `.pptx` before uploading when they need pre-upload Quick Preview.

### Safety guardrails
- Office preview is capped at 50MB to protect browser memory.
- ZIP entries marked encrypted are not bypassed.
- Oversized ZIP members are skipped during preview parsing.
- PPTX Quick Preview is intentionally a content-verification view, not a pixel-perfect PowerPoint clone.
- DOCX Quick Preview is content-oriented; Word-specific pagination and some complex formatting may differ.

## Role guides

Added one reusable `RoleGuideBanner` with role-specific content:
- Student Guide
- Seller Guide
- Admin Guide

Each banner opens an in-place modal/reader, not a separate route. Sections are collapsible, mobile-friendly, and can be dismissed. The guide remains recoverable through `Show guide`.

## UX/accessibility
- Escape closes both the role guide and existing Info dialogs.
- Info dialog title IDs use React `useId()` to avoid duplicate IDs when multiple help buttons appear on one page.
- Mobile guide modal uses a scrollable full-height presentation while desktop remains a large centered dialog.

## Important limitation
A browser-side Quick Preview for legacy `.doc`/`.ppt` is not included because safely and faithfully rendering those binary formats without an external conversion engine would add significant server/runtime complexity. The recommended upload format for modern StudyHub preview is `.docx`/`.pptx`.
