# EWU StudyHub

Academic resource marketplace for university students — upload notes, question
banks, assignments, and projects; publish free or paid; 80/20 revenue split.

This repo is a **Phase 1 scaffold**: auth, homepage, upload, search, preview,
and purchase-gated download all work end-to-end against a real Supabase
project. See `docs/PHASES.md` for what's built vs. what Phases 2–4 still need.

## Stack
Next.js 14 (App Router) · TypeScript · Tailwind · shadcn-style UI · Supabase
(Postgres + Auth + Storage) · Vercel

## Setup

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com), create a project, then in the SQL
Editor run the migrations **in order**:

```
supabase/migrations/0001_initial_schema.sql
supabase/migrations/0002_row_level_security.sql
supabase/migrations/0003_storage_buckets.sql
supabase/migrations/0004_auth_trigger.sql
supabase/migrations/0005_rpc_functions.sql
```

Or, if you have the Supabase CLI installed:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### 2. Seed a university (required before anyone can upload)
```sql
insert into universities (name, short_name, domain)
values ('East West University', 'EWU', array['ewubd.edu', 'std.ewubd.edu']);
```
Add departments/courses similarly, or build an admin UI for it (Phase 3).

### 3. Environment variables
```bash
cp .env.example .env.local
```
Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` from Project Settings → API in Supabase.

### 4. Install and run
```bash
npm install
npm run dev
```

### 5. Deploy
Push to GitHub, import into Vercel, set the same environment variables in the
Vercel project settings.

## Project structure
```
src/
  app/              # routes (App Router)
    (auth)/         # login, signup, forgot-password + shared Server Actions
    dashboard/      # seller dashboard + upload
    files/[id]/     # file preview/detail page
    search/         # browse/search page
    api/            # route handlers: upload, search, download, auth callback
  components/
    ui/             # button, card, input, badge, skeleton (shadcn-style primitives)
    layout/         # navbar, footer
    files/          # file-card, file-grid
    upload/         # upload form
    shared/         # theme provider/toggle
  lib/
    supabase/       # browser client, server client, admin (service-role) client
    utils.ts        # cn(), currency formatting, commission split
    validations.ts  # zod schemas — the single source of truth for input validation
  types/
    database.types.ts  # hand-written starter types; regenerate via Supabase CLI once live
  middleware.ts     # session refresh + protects /dashboard/*
supabase/
  migrations/       # run these in order against your Supabase project
docs/
  PHASES.md         # full roadmap, what's done vs. what's next
```

## Security notes
- Every table has Row Level Security enabled — the API routes rely on RLS as
  the real gate, not just application logic.
- The **service-role key** (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS entirely
  and must never reach client-side code. It's only used in
  `lib/supabase/server.ts`'s `createAdminClient()`, called exclusively from
  server-only route handlers (e.g. generating a signed download URL *after*
  a purchase has already been verified).
- Paid files are never served in full before a completed purchase — see
  `src/app/api/files/[id]/download/route.ts`.
- Uploads are validated for MIME type, size (100MB cap), and sha256-hashed
  for duplicate detection before ever touching storage.

## AI continuity

Private continuity documentation is stored in `.ai/` inside the project ZIP. Read `.ai/00_AI_START_HERE.md` first when continuing the project in a new AI session. The `.ai/` directory is intentionally ignored by GitHub/local Git tracking.


## Production hardening (free-only)
The project includes a local verification script (`npm run verify`), production-readiness runbook (`docs/PRODUCTION_READINESS.md`), owner-safe paid-resource access, transaction timelines and receipt views. Do not commit `.ai/` or secrets. Apply Supabase migrations from `supabase/migrations/` in the live project before using new DB-backed features.


## Free-only release workflow
See `docs/MANUAL_EXTERNAL_STEPS.md` for the manual Supabase, Vercel, GitHub, and real-device steps that cannot be performed purely from source code.

Free local gates: `npm run verify` and `npm run production-audit`.

## AI V1
EWU StudyHub includes an optional server-side Gemini AI layer for seller upload auto-fill, conversational resource discovery, admin moderation/anomaly signals, and seller verification email matching. Configure `GEMINI_API_KEY` server-side. Apply Supabase migration `0042_ai_resource_intelligence.sql` before using these features.


### AI V2 note
EWU StudyHub now includes a conversational AI search layer. Seller AI metadata is persisted separately from seller-final data, while student AI search uses server-side filters plus semantic embeddings. The AI search index is stored in Supabase pgvector and must be backfilled after migration `0043_ai_conversational_search_v2.sql`.


### Latest AI V2 repair note
After AI V2, run `supabase/migrations/0044_type_and_help_schema_alignment.sql` to align the Help/Guide schema/types and preview analytics RPC.

## AI V3.3 Seller Fast Input Path
- Seller AI defaults to `gemini-3.5-flash-lite` with minimal thinking.
- Small transient 1–3 file requests use Gemini inline-data input to avoid File API upload/ACTIVE polling latency; larger inputs fall back to the File API.
- Large multi-file fallback uploads/processes concurrently.
- Seller interactive requests fail fast on transient 429/503 so the UI can present its retry countdown rather than waiting through long automatic backoff.
- Seller AI results remain cached per authenticated seller + file-set hash for 30 days.
- Configure `GEMINI_SELLER_MODEL` to override the seller model; configure `GEMINI_SELLER_FAST_INLINE_MB` to tune the conservative inline threshold.
