# EWU StudyHub — Student Tools Update

Implemented in this update:

1. Improved notifications with category filters: All, Unread, Marketplace, Seller, System.
2. Mobile horizontal-scroll UX for resource/course/department/tool/announcement rows.
3. New `/tools` hub with:
   - Academic Calendar PDF viewer
   - Final Exam Schedule with Spring/Summer/Fall + year selection
   - Deadline Tracker
   - Resource Request
4. Admin panel `/admin/academic-tools` for:
   - Upload/replace academic calendar PDFs
   - Upload/replace final exam schedule PDFs
   - Add/delete deadlines
   - Review/update resource requests
   - Publish/hide homepage announcements/promotions
5. Homepage now has a managed "What's happening on StudyHub" promotion section and a Student Tools horizontal row.
6. Navbar includes a Tools link; student/seller dashboards include a Student Tools shortcut.

## Supabase migration

Run:

`supabase/migrations/0021_ewu_student_tools_and_announcements.sql`

This creates:
- academic_documents
- deadlines
- resource_requests
- announcements
- private `admin-documents` storage bucket

It also adds notification types for announcements, deadlines, admin messages and resource request updates.

## After migration

Open Admin → Academic Tools and upload the current academic calendar and final-exam PDF for the required term/year.
