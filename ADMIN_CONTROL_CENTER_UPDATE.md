# EWU StudyHub — Admin Control Center Update

Implemented admin upgrades:

1. Overview dashboard with marketplace stats.
2. Analytics summary and 7-day revenue bars.
3. Needs-attention queues.
4. Seller verification dashboard with pending/verified/rejected counts.
5. Resource management with search/status filters.
6. Users & roles management with verification/contact data.
7. Security controls: role escalation protection + audit activity log.
8. Admin notification bell showing pending queues.
9. Support remains integrated and visible from the control center.
11. Payments/settings explicitly bKash-only.
12. Global admin search for users, courses and resources.
13. Mobile-responsive admin navigation and layout.

Also preserved the existing Google-only authentication, mandatory phone completion, EWU verification and FAQ system.

## Supabase

Run the new migration after the previous migrations:

`supabase/migrations/0019_admin_control_center.sql`

No destructive schema changes are included.

## Local verification

In the actual project (where node_modules is installed):

```bash
npx tsc --noEmit
npm run build
```

Then commit and deploy to Vercel.

## Update 0072 — Admin Dashboard Quick Actions

The Admin Dashboard now includes a complete one-click Quick Actions control center covering the current Admin module/route inventory, nested Academic Tools/Student Tools entry points, finance/moderation queues, storage, Help/Guide, settings, history and Admin Search.

The buttons keep the existing Admin dashboard card format and semantic colors. Every configured control remains visible; frequently used actions automatically move upward for the current Admin account.

Usage ranking is persisted in `public.admin_quick_action_usage` and recorded through the protected `record_admin_quick_action_use(text)` RPC. Apply migration `0052_admin_quick_action_usage.sql` before production use.
