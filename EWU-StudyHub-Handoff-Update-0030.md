# EWU StudyHub — Handoff Update 0030

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
