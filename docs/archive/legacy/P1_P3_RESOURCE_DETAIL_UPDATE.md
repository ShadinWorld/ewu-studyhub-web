# EWU StudyHub — P1–P3 Resource Detail Update

Implemented on top of `EWU-StudyHub-Resource-Detail-Complete-Update.zip`.

## Included

### P1
1. Real PDF/image preview support on the resource detail page using the public preview PDF/image when available.
2. Mobile sticky View / Download / Buy action bar.
3. Clear Free / Purchased / Payment Pending / Payment Rejected / Buy Again states.
4. Related-resource scoring using course, department, category, semester/year, downloads and rating signals.
5. Seller trust/profile section with verification, seller rating, resources, completed sales and public seller profile.

### P2
6. Dynamic `Why students choose this resource` section based on course, pages, preview, verification and student feedback.
7. Improved review summary with rating distribution, recommendation percentage, verified-purchase badges, helpful voting and helpful-first ordering.

### P3
8. Resource quality indicator based on actual metadata, preview availability, pages, reviews/rating and downloads.
9. Report modal with clear reasons and admin review messaging.
10. Seller rating calculated from reviews across the seller's published resources.
11. Helpful review voting/toggle remains enabled.
12. Dedicated preview viewer supports paid-resource preview mode without granting paid access.

## Upload behavior

- PDF uploads generate a public preview PDF. Free resources expose all pages; paid resources expose a limited sample.
- Free image uploads are copied to the public preview bucket so the actual image can be used as a preview/thumbnail.
- Paid original files remain in the private storage bucket.

## Existing SQL

The archive already contains:

`supabase/migrations/0019_review_helpful_votes.sql`

Run it in Supabase if it has not already been applied.

## Important

Do not copy `.next` or `node_modules` from this archive.

## Verification

Run from the project folder:

```powershell
npm install
npx tsc --noEmit
npm run build
```

Then test:

- Free PDF resource
- Paid PDF resource as non-owner
- Paid resource preview
- Purchased resource View/Download
- Mobile sticky action bar
- Related resources
- Seller profile
- Seller rating
- Review + helpful toggle
- Report modal
