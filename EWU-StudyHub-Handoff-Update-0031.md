# EWU StudyHub — Handoff Update 0031

## Latest Change — Image Preview Lock

- Paid image resources now expose a visible **Preview** action on the resource detail page.
- Added a protected `/api/files/[id]/preview/image` endpoint that serves only the stored preview asset, never the private original image.
- Paid image previews now target approximately **30% visible / 70% locked**.
- The viewer shows the partial image preview at the top and a page-shaped locked area below with lock messaging and a Purchase CTA.
- A completed purchaser is redirected to the normal full viewer instead of receiving the partial preview.
- Original paid image files remain in `files-private`; preview assets remain separate.
- Existing paid-image preview generation remains backward-compatible with the stored 40% preview asset; the new endpoint crops it to the intended 30% exposed portion.

## Validation
- Source validation was attempted, but this ZIP has no `node_modules` and the environment cannot install the uncached npm package `zod`; therefore a full TypeScript/build validation could not be completed here.

## Current Immediate Focus
- Verify paid image preview visually on mobile + desktop.
- Confirm Preview button appears for paid image cards/detail pages.
- Confirm free/purchased images still open/download fully.
- Confirm original paid image is never exposed to an unauthorized user.


## Current State
Latest working package:
- EWU StudyHub Update 0030 — Preview Page Lock Fix

Project:
- EWU-focused academic resource marketplace + student utility platform.
- Stack: Next.js 14, TypeScript, Tailwind, Supabase/PostgreSQL/Auth/Storage/RLS, Vercel, GitHub.

## Latest confirmed product decisions

### Authentication / Profile
- Google login is supported.
- WhatsApp number is required for profile completion.
- bKash number is for seller payout/payment settings.
- Incomplete profiles should be gated from protected areas and prompted to complete the profile.
- Home and Courses remain accessible.

### Seller / Notifications
Seller actions have lifecycle states:
- Resource upload: Pending → Waiting for admin approval → Approved/Rejected
- Seller verification: Pending → Approved/Rejected
- Payout/payment request: Pending → Approved/Rejected

Required UX:
- Show submission timestamps.
- After submission, immediately navigate to the Notifications/status page.
- Home should surface important pending actions.
- Quick Actions should expose Notifications/Pending Actions with badge where relevant.
- Seller must always understand whether an action is pending, approved, or rejected.
- Seller approval should show a congratulations message/notification.

### Seller-owned resources
- Seller cannot purchase their own resource.
- Enforce server-side and database-side where appropriate.
- Seller should clearly see ownership state.
- Seller's latest uploads should be prioritized ahead of generic recent resources on their own homepage.

### Resource preview — latest exact requirement
For a paid multi-page PDF:
- Entire document length/page structure should be visible in the viewer.
- First ~30% of pages are actual readable preview pages.
- Remaining pages appear as page-shaped locked placeholders.
- Each locked page should contain:
  - lock icon
  - short locked message
  - Purchase CTA
- No watermark.
- Purchase CTA goes to the resource checkout.
- Original paid file must not be delivered to unauthorized users.

Example:
- 10 pages → pages 1–3 readable, pages 4–10 page-shaped locked placeholders.

Single-page paid PDF:
- Partial/page-shaped preview with locked remainder and purchase CTA.

Single-image paid resource:
- Partial/cropped preview with locked remainder and purchase CTA.

Free or purchased resources:
- Full access.

### Admin Resource Management
Admin resource listing should expose:
- file size
- search/filter
- seller
- price
- status
- view/download
- remove

Removing a resource should safely remove DB record and associated storage/preview assets.

### Academic documents
Academic Calendar and Final Exam Schedule uploads support:
- PDF
- JPG/JPEG
- PNG
- WEBP
- GIF
- term + year metadata, including Spring/Summer/Fall across years.

### Facebook / external browser
- Detect Facebook/Instagram/Messenger in-app browser where possible.
- Show an Open in Browser prompt.
- Do not claim the website can force every in-app browser to switch externally.

### Performance
Goals:
- fast on weak internet
- fast first load
- low JS payload
- server components where appropriate
- lazy loading
- optimized thumbnails/images
- pagination
- debounced search
- selective DB columns
- caching/prefetch where safe
- avoid duplicate queries/auth refresh
- protected/CDN-based file delivery
- remain responsive with thousands of users and tens of GB of files

### Admin User Management
Useful filters:
- newest/recent users
- role
- seller/non-seller
- account status
- today / last 7 days / last 30 days
- sorting, especially newest first

### Admin feedback
Use a global toast/success/error system for admin save/change actions.

### Removed features
Do NOT restore unless explicitly requested:
- Prerequisite Checker
- Grade Calculator

Old Blue Book prerequisite extraction work is obsolete.

## AI direction
Initial AI priorities:
1. AI Table of Contents
2. AI Resource Summary

Preferred workflow:
PDF upload → one AI processing request → TOC + summary → save in Supabase → reuse for all viewers.

Initial preference:
- Gemini Free Tier where appropriate.
- Keep API keys server-side.
- Cache generated output.
- Do not regenerate on every resource view.
- Keep provider integration replaceable.

## Validation
Run locally:
```bash
npm install
npx tsc --noEmit
npm run build
```

Typical deploy:
```bash
git add .
git commit -m "..."
git push origin main
```

## Source of truth
1. Latest ZIP/source code
2. Current DB schema/migrations
3. Current user instruction
4. This handoff
5. Old conversation history

## Immediate focus
Verify preview end-to-end:
- 10-page paid PDF
- first 3 actual pages readable
- pages 4–10 page-shaped locked placeholders
- each has lock/message/Purchase CTA
- no watermark
- original paid file stays protected
- purchase unlocks full viewer/download
- free resources remain full-access

Then run TypeScript and production build and fix all remaining issues.

# Update 0032 — Preview Route TypeScript Body Fix

## Date
2026-08-19

## Issue reported
Local `npx tsc --noEmit` reported two TypeScript errors:
- `src/app/api/files/[id]/preview/image/route.ts:97`
- `src/app/api/files/[id]/preview/page/[pageNumber]/route.ts:55`

Root cause: `pdf-lib` returns `Uint8Array<ArrayBufferLike>`, which is not accepted directly by the current NextResponse `BodyInit` typing in this project.

## Fix applied
Both preview API routes now copy the generated bytes into a concrete `ArrayBuffer` before passing the body to `NextResponse`:

```ts
const responseBody = new ArrayBuffer(bytes.byteLength);
new Uint8Array(responseBody).set(bytes);

return new NextResponse(responseBody, { ... });
```

This keeps the existing preview logic unchanged and only fixes the response-body typing/runtime compatibility.

## Validation
The submitted project package does not include `node_modules`, so `tsc` could not be executed inside this environment. The fix is specifically targeted at the two reported compiler errors. Re-run locally:

```bash
npx tsc --noEmit
```

Expected result: the two `NextResponse(bytes, ...)` type errors should be gone.

## Current preview behavior
- Paid PDF preview: first 3 pages readable for a 10-page document; remaining pages locked.
- Paid image preview: first 30% visible; remaining 70% locked.
- Free/purchased resources retain full access.
- Paid originals remain protected.

# Update 0033 — Legacy Paid Image Preview Fallback

## Date
2026-08-19

## Issue reported
Opening the preview for some published paid image resources returned:
```json
{"error":"Preview is not available for this image yet."}
```

## Root cause
Older paid image resources can have `files.preview_storage_path = null` because they were uploaded before the paid-image preview generation was added. The preview endpoint previously returned a 404 whenever `preview_storage_path` was missing.

## Fix applied
Updated `src/app/api/files/[id]/preview/image/route.ts`:
- The file query now also loads `storage_path`.
- If `preview_storage_path` exists, the existing pre-generated preview path is used.
- If it is missing, the endpoint securely downloads the original from the private `files-private` bucket server-side and generates a PDF containing only the top 30% of the original image.
- The original image is never exposed to the browser.
- Purchased users still redirect to the full viewer.
- Unauthenticated users are still sent to login before preview access.

This makes the 30% paid-image preview work for both newly uploaded resources and legacy resources that lack a stored preview file.

## Validation
This environment does not contain `node_modules`, so a full `npx tsc --noEmit` run is not possible here. The reported previous TypeScript body errors were already addressed in Update 0032. Please run locally:
```bash
npx tsc --noEmit
npm run build
```

## Current preview behavior
- Paid PDF: first 30% of pages readable; remaining pages are locked placeholders.
- Paid image: top 30% of image visible; bottom 70% locked with purchase CTA.
- Legacy paid images without `preview_storage_path` now get an on-demand safe preview.
- Free/purchased resources retain full access.
- Paid originals remain protected in the private bucket.
