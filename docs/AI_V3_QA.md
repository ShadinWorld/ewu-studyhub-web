# EWU StudyHub AI V3 — Conversational Search Quality & QA

## Scope
AI V3 is a quality-focused refinement of the AI V2 conversational search. It keeps Gemini as the intent/response layer and Supabase as the authoritative search/data layer.

## Target behavior
- Persistent structured search state across follow-up turns.
- English, Bangla and Banglish intent parsing.
- Separate course discovery from resource discovery.
- Hybrid retrieval using structured filters, lexical matching and Gemini embeddings.
- Intent-aware ranking: relevance, popularity, downloads, rating, newest, cheapest.
- Exact vs closest/fallback result separation.
- No fabricated courses/resources/prices/ratings.
- Natural response composition grounded only in returned data.
- Resource Request fallback when no relevant result exists.

## Example QA cases
1. `CSE303 ki ki ache`
2. `konta beshi popular`
3. `free gula dekhao`
4. `Spring 2026`
5. `rating 4+`
6. `PHP ache kon course a`
7. `CSE303 PHP notes`
8. A nonsense/nonexistent topic with no result
9. A valid topic with no exact price/semester combination
10. Replacing topic in an existing search, e.g. `Java instead`

## Validation performed in development sandbox
- Modified AI route/client/gemini files TypeScript transpile: PASS.
- Full source TS/TSX transpile scan excluding `next-env.d.ts`: PASS (213/213 source files transpiled without syntax diagnostics).
- `npm run verify`: PASS.
- `npm run production-audit`: PASS.
- Full `npx tsc --noEmit` could not be completed in the sandbox because dependency installation timed out; the source tree has no complete `node_modules` available in this runtime.

## Production/live checks still required
- Run `npx tsc --noEmit` in the project's real development environment.
- Run `npm run build`.
- Run real Gemini conversational queries.
- Validate `0043_ai_conversational_search_v2.sql` is applied and AI embeddings are indexed.
- Check RLS/authorization remains authoritative for returned resources.

## V3.1 Seller + Admin AI matrix
11. One selected file → `single` → title/description/TOC/metadata filled.
12. Two related files → `related_bundle` → combined metadata + per-file breakdown.
13. Three related files → `related_bundle` → combined TOC preserves file-level sections.
14. Two unrelated files → `mixed_bundle` → title/description/TOC still generated, conflict warning shown, course optional.
15. Mixed bundle with a manually selected course → seller edits and final save remains authoritative.
16. Admin Resources → AI Review → advisory decision, risk score, evidence and recommended checks persist.
