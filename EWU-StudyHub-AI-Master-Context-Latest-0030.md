# EWU StudyHub — Master AI Context (Latest 0030)

You are an engineering/product assistant for an existing project named EWU StudyHub. The latest ZIP/source code is the technical source of truth.

## Product
EWU StudyHub is an EWU-focused academic resource marketplace and student utility platform.

Core flow:
Department → Course → Resource → Preview / Buy / Download

Audiences:
- Students
- Sellers
- Admins

## Stack
- Next.js 14 / App Router
- TypeScript
- Tailwind CSS
- Supabase/PostgreSQL
- Supabase Auth
- Supabase Storage
- RLS/RPC where applicable
- Vercel
- GitHub
- Resend/SMTP where configured

## Main product areas
- Authentication
- Google login
- Profile completion
- Department/course catalog
- Resource marketplace
- Resource upload
- Resource preview
- Purchase/download
- Seller verification
- Seller dashboard
- Admin dashboard
- Payout/payment workflow
- Notifications
- Resource Requests
- Academic Calendar
- Final Exam Schedule
- Deadline Tracker
- Homepage promotions

## Authentication
- Google login is supported.
- WhatsApp number is the required profile-completion contact field.
- bKash number is for seller payout/payment settings.
- Incomplete profiles are gated from protected functionality.
- Home and Courses remain accessible.
- Google OAuth 400 errors must be tested against current Supabase + Google OAuth configuration.

## Seller lifecycle
Resource upload, seller verification, and payout/payment requests use:
- pending
- approved
- rejected

Always show:
- current status
- submission time
- next action

On submission:
- create/update notification
- navigate to Notifications/status
- surface pending state on Home
- expose in Quick Actions with badge when useful

Seller approval should trigger a congratulations notification/message.

## Seller-owned resources
- Seller cannot purchase own resource.
- Enforce server-side/database-side.
- Show ownership clearly.
- Prioritize seller's newest resources before generic Recent Resources on seller's homepage.

## FINAL PREVIEW UX — IMPORTANT
Do not interpret preview as a single locked message.

For a 10-page paid PDF:
- Page 1–3 are actual readable preview pages.
- Page 4–10 are page-shaped locked placeholders.
- Each locked page has:
  - lock icon
  - short message
  - Purchase button
- No watermark.
- Purchase button links to the exact resource checkout.

Security:
- Do not send the original paid file to unauthorized users.
- Generate/serve preview content separately from the protected original.

For a single-page paid PDF:
- show a partial/page-shaped preview with locked remainder and purchase CTA.

For a single-image paid resource:
- show partial/cropped preview with locked remainder and purchase CTA.

Free/purchased:
- full viewer/download.

Recommended multi-page preview:
`preview_pages = max(1, ceil(total_pages * 0.30))`
A cap may be applied for very large PDFs.

## Notifications
Notifications should communicate state clearly:
- Resource upload pending
- Seller verification pending
- Payout/payment pending
- Approved
- Rejected

Include:
- timestamp
- entity/resource/payment reference
- action link
- read/unread state

Submitting one of these actions should navigate the user to Notifications/status.

## Admin
Admin resources:
- file size
- search/filter
- seller
- price
- status
- view/download
- remove

Admin users:
- role filter
- seller/non-seller
- status
- recent time ranges
- newest-first sorting
- WhatsApp/message action

Admin actions need global success/error toasts.

## Academic documents
Academic Calendar and Final Exam Schedule accept:
- PDF
- JPG/JPEG
- PNG
- WEBP
- GIF
with term/year metadata.

## Performance
Optimize for low bandwidth and growth:
- server components where appropriate
- minimal client JS
- lazy loading
- optimized thumbnails
- pagination
- debounce search
- selective DB columns
- caching/prefetch
- avoid duplicate auth/session queries
- keep large files out of list/card payloads
- object storage/CDN/signed URLs for protected files

Target:
- thousands of users
- tens of GB of files
- fast navigation independent of total storage volume

## Facebook / external browser
Detect in-app browser and show an Open in Browser prompt. Do not promise forced Chrome/Safari launch.

## Removed
Do NOT restore:
- Prerequisite Checker
- Grade Calculator

Old Blue Book prerequisite extraction is obsolete and must not be used as current product data.

## AI roadmap
Initial AI:
1. AI TOC generation
2. AI resource summary

Preferred:
PDF upload → one AI call → TOC + summary → store in Supabase → reuse for all viewers.

Use free-tier Gemini initially where appropriate, but never promise unlimited free API usage. Keep provider keys server-side and provider integration replaceable.

## Development rules
- Inspect the latest ZIP before changing anything.
- Preserve working architecture.
- Do not invent routes, tables, RPCs, or fields.
- Fix root causes, not just UI symptoms.
- Keep mobile responsive.
- Keep server-side security checks for purchases, payouts, admin actions, and protected files.

## Validation
Run:
```bash
npm install
npx tsc --noEmit
npm run build
```
and manually verify relevant flows.
