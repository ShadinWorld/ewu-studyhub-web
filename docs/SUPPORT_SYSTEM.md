# EWU StudyHub Support System

Implemented support features:

1. Floating WhatsApp admin button on all pages.
2. Homepage feedback / complaint field.
3. Support Center at `/support`.
4. Resource reporting from the resource detail page.
5. Payment and purchase problem reporting through Support Center.
6. Seller / payout support through Support Center.
7. Admin reply + status workflow at `/admin/support`.
8. Feedback statistics in the admin support page and Action Center.
9. WhatsApp + website support paths are connected.

## Supabase
Run `supabase/migrations/0015_support_feedback_system.sql` in Supabase SQL Editor.

## WhatsApp number
The floating button uses `NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER` when configured. It falls back to the platform bKash number already present in the project (`01716529460`).
