# Phase 2A + 2B — Report

## 1. What was changed (summary)
- Fixed the root TypeScript architecture problem (full 26-table `Database` type)
- Found and fixed a second, deeper root cause behind the same symptom (a
  dependency version mismatch)
- Audited existing queries (light findings, see §2)
- Built the full course-first navigation spine: Departments → Department →
  Courses → Course → Resources
- Built `/trending` on real, previously-broken tracking data (and fixed the
  tracking)
- Integrated Departments/Popular Courses into the homepage, kept the rest
  of the homepage as-is per your instruction not to redesign it yet
- Added `Courses` to desktop nav (Departments/Trending links already
  existed, they just 404'd before)

## 2. Existing-query audit (Phase 2A §2)
- Only one `select("*")` found: `src/app/dashboard/page.tsx` (seller's own
  uploads list). Low-risk (bounded to the logged-in seller's own rows) —
  flagging it, not changed, since it's outside this phase's file list.
- Pagination (`.range`/`.limit`) already used in `/search`, `/admin/users`,
  homepage, and the upload route — reasonable existing pattern, followed
  the same convention in the new `/courses` page.
- `increment_view_count` RPC existed in `0005_rpc_functions.sql` but was
  **never called anywhere** — `files.views_count` was always 0. Fixed by
  calling it from `files/[id]/page.tsx` (mirrors the existing
  `increment_download_count` call already in the download route). This
  matters directly for Trending's ranking quality — documented in code
  comments and accounted for in the ranking weights (see `/trending`).

## 3. Files created
| File | Purpose |
|---|---|
| `src/lib/constants.ts` | Shared `RESOURCE_CATEGORIES` / `SEMESTERS` — de-duplicated from `upload-form.tsx` so Resource cards/filters/tabs use the same source of truth |
| `src/components/departments/department-card.tsx` | Reusable department card (name, course count, resource count) |
| `src/components/courses/course-card.tsx` | Reusable course card (code, name, credit, resource count) |
| `src/components/courses/course-filters.tsx` | Client search box + department filter for `/courses`, syncs to URL params |
| `src/components/files/resource-card.tsx` | Richer resource card (adds category badge, course code, seller name) + `ResourceCardGrid` with a built-in empty state |
| `src/components/files/resource-filters.tsx` | Client category tabs + year/semester/pricing/sort controls for course pages |
| `src/app/departments/page.tsx` | Departments listing, real course/resource counts |
| `src/app/departments/[departmentId]/page.tsx` | One department's courses, with course search |
| `src/app/courses/page.tsx` | Global course search, department filter, pagination |
| `src/app/course/[courseId]/page.tsx` | Course hub: header/stats + category tabs + filters + resource grid |
| `src/app/trending/page.tsx` | Real ranking (see algorithm doc in the file) |

## 4. Files modified
| File | Change |
|---|---|
| `src/types/database.types.ts` | **Full rewrite.** All 26 tables typed (was 3 typed + a catch-all `[key: string]: any` that resolved to `never` for everything else). Added the `Relationships: []` field required by `@supabase/postgrest-js`'s `GenericTable` — omitting it was silently rejecting the whole `Database` generic at the `createClient<Database>()` call site (see §5). Added `Functions` typing for the 3 existing RPCs. |
| `src/lib/supabase/server.ts` | `createAdminClient()` was using `require("@supabase/supabase-js")` (untyped, causing its own separate `TS2347` error) — switched to a normal `import`. No behavior change. |
| `src/components/layout/navbar.tsx` | Added `Courses` link; removed an `as any` cast on `role` now that it's properly typed |
| `src/components/layout/user-menu.tsx` | Local `Role` union type replaced with the shared `UserRole` type |
| `src/components/upload/upload-form.tsx` | Local `CATEGORIES`/`SEMESTERS`/`Department`/`Course` types replaced with the shared ones from `constants.ts`/`database.types.ts` (no behavior change, removes duplication) |
| `src/app/files/[id]/page.tsx` | Added the missing `increment_view_count` call (see §2) |
| `src/app/page.tsx` | Added "Browse Departments" and "Popular Courses" sections (real data); "Trending this week" `View all` link now points to the real `/trending` page instead of `/search?sort=trending` |
| `package.json` | `@supabase/ssr` version range changed — see §5 |

## 5. The real root cause (important — please read)

Fixing `database.types.ts` alone did **not** make the pre-existing `never`
errors go away, so I dug further instead of declaring it done. Two
compounding issues, both now addressed:

**a) `Relationships` field.** `@supabase/postgrest-js`'s `GenericTable` type
requires `{ Row, Insert, Update, Relationships }` — the original file (and
my first rewrite pass) only had `Row/Insert/Update`. Missing this doesn't
error where you'd expect (on the `Database` type itself) — it silently
fails to satisfy the generic at the `createClient<Database>()` call site,
so TypeScript drops the whole generic and every table resolves to `never`.
Fixed by adding `Relationships: []` to every table entry.

**b) Dependency version mismatch (the deeper cause).** `package.json` pins
`"@supabase/ssr": "^0.4.0"`. Because `0.x` versions use a stricter npm
caret rule (`^0.4.0` only ever matches `0.4.x`, never `0.5.0+`), this
package has stayed frozen on an old release — while `"@supabase/supabase-js":
"^2.45.0"` has no such restriction and resolves to whatever the newest 2.x
release is. In this project that's `2.112.0`, which restructured its build
output (flat `dist/index.*` files). `@supabase/ssr@0.4.0`'s own type
declarations still `import type { GenericSchema } from
"@supabase/supabase-js/dist/module/lib/types"` — a path that doesn't exist
in `2.112.0` anymore. I confirmed this directly: type-checking that import
in isolation gives `TS2307: Cannot find module`.

**Fix applied:** changed the range to `"@supabase/ssr": ">=0.6.0 <1.0.0"`
in `package.json`, so npm can pick up a version of `@supabase/ssr` that
matches how modern `@supabase/supabase-js` is laid out.

**⚠️ I could not fully verify this resolves to 0 errors.** This sandbox
has no network access, so I can't run `npm install` to actually fetch the
corrected `@supabase/ssr` version and re-check. You'll need to:
```
rm -rf node_modules package-lock.json
npm install
npx tsc --noEmit
```
in your real environment and tell me what's left. I'd genuinely expect
this to clear the entire `never`-cascade (it's the same error, in the same
shape, on every single table — consistent with one systemic cause rather
than 26 separate ones) — but I want to say that as an expectation, not a
verified fact, since I can't check it myself here.

(Also still present, unrelated to this: `pdf-lib` genuinely isn't in
`node_modules` in this sandbox snapshot despite being in `package.json` —
flagged back in an earlier session too. `npm install` above will also
resolve that.)

## 6. Trending ranking algorithm (as requested, documented before/with
   implementation — see full comment in `src/app/trending/page.tsx`)
```
score = downloads_count * 3 + views_count * 1 + (average_rating * reviews_count) * 2
```
- `downloads_count` weighted highest — it's been tracked correctly since
  launch (confirmed in the audit).
- `views_count` weighted lowest — it only starts being accurate as of this
  change (see §2), so it needs to "catch up" before it's a trustworthy
  signal on older files.
- `average_rating * reviews_count` rewards *trusted* quality (a 5.0 rating
  from 1 review scores lower than a 4.5 average from 10).
- Computed in application code over all published files — fine at today's
  scale (low hundreds), but noted in a code comment as something to move
  to a Postgres function/materialized view if the catalog grows into the
  thousands.

## 7. Database changes
**None.** No new migrations. Course/department data untouched, per your
explicit instruction.

## 8. RLS changes
**None.** All new pages only read already-public data (`departments`,
`courses`, and `files` filtered to `visibility = 'published'`), which the
existing RLS policies already allow for anonymous/public reads.

## 9. Mobile
All new pages use the same responsive grid patterns already established
in the codebase (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3/4`) — not
pixel-audited on a real device from this sandbox, so please sanity-check
`/departments`, `/courses`, and a `/course/[id]` page on an actual phone.
Per your instruction, I did **not** build the dedicated mobile bottom nav
(that's explicitly Phase 2C).

## 10. Loading / empty / error states
- Empty states: `ResourceCardGrid` (used on Course detail + Trending)
  shows "No resources found" / helper text; Departments and Courses pages
  show "No departments found" / "No courses match your search."
- `notFound()` (real 404) on `/departments/[id]` and `/course/[id]` for
  bad IDs.
- Loading states: `Suspense` boundaries with skeleton placeholders around
  `CourseFilters`, `ResourceFilters`, `DepartmentsPreview`, and
  `PopularCourses` on the homepage (same pattern the existing
  `TrendingFiles`/`FileGridSkeleton` already used).

## 11. How to test
1. Apply the files in this zip, then in your real environment:
   ```
   rm -rf node_modules package-lock.json
   npm install
   npx tsc --noEmit
   ```
   and tell me the output.
2. `npm run dev`, then visit:
   - `/departments` — should list real departments with course/resource counts
   - `/departments/<id>` — pick one, should show its real courses
   - `/courses` — search a course code (e.g. "cse"), filter by department, page through results
   - `/course/<id>` — pick a course with resources, try the category tabs and filters
   - `/trending` — should show real files ranked by the formula in §6
   - `/` — check the two new homepage sections render, and "View all" links go to the right places

## 12. Remaining issues (not touched, out of this phase's scope)
- TypeScript verification pending your `npm install` (§5)
- `/search` not upgraded (not in this phase's file list)
- Wishlist/Reviews/Payments/Payouts/AI — explicitly deferred, not started
- Mobile bottom nav — Phase 2C
- The one `select("*")` in `dashboard/page.tsx` (§2) — flagged, not fixed (outside this phase's file list)
