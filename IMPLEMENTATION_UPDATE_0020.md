# EWU StudyHub — Update 0020

This update implements the requested next feature set:

1. Automatic seller payouts after an approved purchase. Seller no longer needs to request a payout.
2. Platform commission can be percentage or fixed BDT amount.
3. Google OAuth callback always lands on the home page. Phone completion is only enforced for protected account actions.
4. Admin can open a complete user profile from Admin → Users.
5. Seller dashboard keeps Upload in Quick Actions.
6. Logged-out home hero includes Login / Get started.
7. Home welcome shortcuts are role-aware: student → Become a seller, seller → Upload, admin → Admin.
8. Mobile admin dashboard/menu uses a real client menu that closes on navigation, outside click and Escape.
9. Admin Storage page reports usage by bucket and object count.
10. Mobile admin menu bug is fixed.
11. Admin overview adds storage monitoring and a Storage quick link.
12. Removed the resource-side “Why students choose this resource” card.
13. Seller upload form now supports an optional Table of Contents / What’s inside field, shown on the resource page.
14. Admin can message users from their profile and open WhatsApp using the saved phone number.
15. Account/seller forms now explain that the number is used for WhatsApp/contact/payouts.
16. Seller ID upload no longer forces camera capture; mobile browsers can offer camera or gallery.
17. Users can change profile photo and change their name once every 30 days.
21. Admin can set account status: active / restricted / suspended / banned.
22. User/status/message/storage actions are written to audit logs.
23. Admin Storage exposes orphan cleanup candidates and server-side delete actions.

## Supabase migration

Run:

`supabase/migrations/0020_marketplace_admin_profile_storage.sql`

in the Supabase SQL Editor after the existing migrations.

## Important

The project archive intentionally does **not** include `node_modules` or environment secrets.

After replacing the source files locally:

```bash
npm install
npx tsc --noEmit
npm run build
```

Then deploy the updated project.
