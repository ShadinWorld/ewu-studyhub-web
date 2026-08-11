# EWU StudyHub — Build Roadmap

This scaffold implements **Phase 1** with real, working code. Phases 2–4 are
architected for (schema, folder structure, stub routes) but need real
integrations (payment gateway credentials, AI API keys, testing, deployment)
that only make sense to wire up against a live Supabase project.

## Phase 1 — Core (done in this scaffold)
- [x] Database schema (all tables for all 4 phases, so nothing needs a breaking migration later)
- [x] Row Level Security on every table
- [x] Auth: signup, login, forgot password, email confirmation callback
- [x] Homepage, Navbar, Footer, dark/light theme
- [x] Upload flow: validation, mime/size checks, sha256 duplicate detection, rate limiting, private storage
- [x] Search: text search + filters (pricing, department, year), API + UI
- [x] File preview/detail page — paid files are never exposed before purchase
- [x] Download route — purchase-gated signed URL (60s TTL) + watermark logging
- [x] Seller dashboard — revenue, wallet balance, downloads, uploaded files

### Still needed for Phase 1 to be "done":
- University email verification flow (OTP to `@ewubd.edu` style domains — table + `university_email_verified` column already exist; needs an email-sending provider, e.g. Resend, and an OTP table/route)
- Student ID document upload + admin review queue UI (storage bucket + verification_status column already exist)
- Admin approval UI to flip `files.visibility` from `draft` → `published`
- Cover-page/sample-page/blurred-preview generation pipeline (needs a PDF-processing worker — e.g. a Supabase Edge Function using `pdf-lib` or `pdfium`)
- Course/department listing pages, file report button + modal

## Phase 2 — Money
- Payment gateway integration: bKash, Nagad, Rocket (each has its own merchant API — needs real merchant credentials to build against; `.env.example` has the placeholders)
- `/checkout/[fileId]` flow: create `purchases` row as `pending` → redirect to gateway → webhook confirms → flip to `completed`, split 80/20 via `splitCommission()` in `lib/utils.ts`, credit seller wallet via `wallet_transactions`
- Payout requests (seller withdraws wallet balance) — `payouts` table exists; needs an admin processing UI
- Reviews UI (schema + RLS already restrict to verified purchasers)
- Notification triggers (DB → email via Resend/SendGrid + in-app `notifications` table, already schema'd)
- Real PDF watermarking: burn buyer name/ID/txn ID into the downloaded PDF (`pdf-lib`), log to `download_watermarks` (already wired)

## Phase 3 — Intelligence
- AI pipeline (Claude API) triggered on upload: generate `ai_summary`, `ai_keywords`, `ai_difficulty`, `ai_reading_time_minutes` — columns already exist on `files`
- MCQ / flashcard / viva-question generation, "AI chat with this PDF" — new tables needed (not yet in schema; add `ai_generated_content` table keyed by `file_id` + `content_type`)
- Recommendation system: "students who downloaded this also downloaded" (co-occurrence query on `purchases`), semester/department recommendations (filter `profiles.semester`/`department_id` against `files`)
- Admin analytics dashboard reading from `platform_daily_stats` / `file_daily_stats` (already populated by the RPC functions in `0005_rpc_functions.sql`)

## Phase 4 — Hardening
- Automated tests (Vitest/Playwright)
- Image optimization audit, lazy-loading/infinite scroll on `/search`
- SEO: sitemap, per-file `generateMetadata`, structured data (Product schema for paid files)
- Load testing on search and download routes
- Production deployment on Vercel + Supabase project promotion (staging → prod)

## Multi-university expansion
Already built in from the schema up: every `files`/`profiles` row is scoped to a
`university_id`. Adding a second university is a data operation (insert into
`universities`, `departments`, `courses`), not a code change.
