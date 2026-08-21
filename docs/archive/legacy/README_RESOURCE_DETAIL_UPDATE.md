# EWU StudyHub — Resource Detail UX Update

This package is based on the latest EWU StudyHub project archive that already contains:
- Google-only authentication
- mandatory phone completion
- EWU verification / seller verification
- FAQ admin management
- current marketplace/admin updates

## Resource detail improvements included

1. Professional resource header with course, department, type, semester, language, rating, views and downloads.
2. Better ownership/payment states.
3. Dedicated in-app PDF viewer at `/files/[id]/viewer`.
4. Improved download UX.
5. Structured resource reporting remains available.
6. Seller profile section with Google avatar, EWU verification badge, resource count and completed sales.
7. Rating distribution.
8. Verified-purchase review badge and 500-character review limit.
9. Helpful review voting with toggle support.
10. Resource details card.
11. Better description / quick summary / keyword presentation.
12. Related resources from the same course.
13. Additional related resources.
14. Mobile sticky View/Download/Buy action bar.
15. Desktop sticky purchase/access sidebar.
16. Breadcrumb navigation.
17. Better empty review state.
18. Better review ordering (helpful votes first, then newest).
19. Responsive mobile/desktop layout improvements.
20. Cleaner marketplace-style visual hierarchy.

## SQL

Run this migration in Supabase SQL Editor after copying the project:

`supabase/migrations/0019_review_helpful_votes.sql`

It adds the RLS delete policy needed for removing your own helpful review vote. The application API still performs the vote update server-side.

## Verification

From the project folder:

```powershell
npx tsc --noEmit
npm run build
```

Then test:
- open a free resource
- open a paid resource as a non-owner
- complete/purchase a resource and open View Resource
- test Download
- submit/update a review
- click Helpful twice to test toggle
- submit a report
- check mobile sticky action bar
- check same-course and related resources

Do not copy `.next` or `node_modules` from this archive.
