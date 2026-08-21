# EWU StudyHub Production Readiness (Free-Only Path)

## Local validation

```bash
npm install
npx tsc --noEmit
npm run build
npm run verify
```

## Critical security smoke tests
- Guest cannot read private paid originals.
- Unpaid buyer cannot access paid original.
- Seller/admin owner can view/download their own resource without purchasing.
- Owner cannot submit a self-purchase through the checkout action.
- Admin-only pages and settings stay protected by role checks + RLS.
- Homepage admin configuration tables are not publicly readable.

## Functional E2E checklist
- Sign up → login → profile completion.
- Upload → pending → approve/reject → seller status.
- Buyer submits bKash payment → pending → admin decision → access.
- Seller sees purchase/sale timeline and payout timeline.
- Request center shows IDs, ETA, status history and admin outcomes.
- Giant Hero: publish now, duration, schedule, audience, order, carousel, mobile/desktop.
- Admin Quick Attention / Needs Attention / Quick Actions.

## Mobile QA
Test 360×800, 390×844 and 412×915 widths plus desktop. Check tap targets, text wrapping, sticky action bar, banner swipe, section minimize/restore, checkout and admin grids.

## Operations
- Apply migrations in order using Supabase SQL Editor.
- Keep `.env.local` and secrets out of Git/ZIP.
- Keep `.ai/` in the ZIP/local copy but ignored by Git.
- Use Git commits with clear messages.
- Before deployment, run the local build and type-check.

## No paid tools required
The hardening path is intentionally compatible with GitHub Free, Vercel Free, Supabase Free, Node scripts and optional local test tooling. Paid monitoring/analytics/AI APIs are not required for this baseline.
