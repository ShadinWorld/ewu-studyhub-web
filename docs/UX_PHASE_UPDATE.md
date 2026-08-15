# EWU StudyHub UX Phase Update

Implemented:

1. Exact course-code search: searching a code such as `CSE303` shows an exact course match card and filters the resource results to that course.
2. Personalized logged-in homepage: welcome strip plus quick access to Purchases, Saved and Dashboard.
3. Improved resource/course/department cards and a smart WhatsApp help modal with support categories and account/page context.
4. Recently viewed and saved resources are surfaced for signed-in users.
5. FAQ section on the public homepage, managed from `/admin/faqs`.
6. Improved footer navigation and trust/support links.
7. Homepage order: Recently Viewed -> Saved Resources -> Popular Resources -> Popular Courses -> Departments -> FAQ -> Support/Upload.

## Database

Run the new migration:

`supabase/migrations/0018_faqs.sql`

It creates the `faqs` table, RLS policies, an updated-at trigger and initial FAQ content.

## WhatsApp

The existing `NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER` environment variable is still used. No new secret is required.
