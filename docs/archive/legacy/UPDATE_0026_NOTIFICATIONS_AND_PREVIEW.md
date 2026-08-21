# EWU StudyHub Update 0026 — Action Status Notifications + Locked Preview

Implemented only the latest confirmed requirements.

## Notifications
- Added a large Action Status section to `/notifications`.
- Pending seller verification, resource approval, payment verification, and seller payout actions stay visibly pending until the underlying database status changes.
- Displays submitted/request time.
- Added immediate redirects to `/notifications` after seller verification submission, resource upload submission, and bKash payment submission.
- Added pending notifications for seller verification, resource upload, and buyer payment submission.
- Added seller-facing pending payout notification when a payout is created.
- Pending notifications are marked read when the corresponding admin action resolves them; the resolved approval/rejection/completion notification remains in history.

## Preview
- Paid multi-page PDFs now expose approximately the first 30% as readable preview pages.
- Remaining pages stay present as locked pages containing a purchase message.
- Paid single-page PDFs get a partial cropped preview rather than full-page access.
- Paid single-image resources get a partial-preview PDF with the lower portion locked.
- No watermark is added.
- Preview viewer includes a Purchase button and a clear locked-content message.
- Resource access UI includes Preview + Purchase buttons when a preview is available.
- Free and purchased resources keep full access.

## Important
- No prerequisite or grade-calculator changes were made in this update.
- New migration: `supabase/migrations/0024_notification_action_status_and_previews.sql`
