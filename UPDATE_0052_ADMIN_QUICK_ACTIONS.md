# EWU StudyHub — Update 0052: Admin Dashboard Quick Actions

## What changed

- Added a complete Admin Dashboard Quick Actions control center.
- Inventory covers the current `/admin` operational routes, nested Academic Tools, Student Tools entry points, moderation queues, finance queues, Help/Guide, storage, settings, history and admin search.
- Preserved the existing Admin dashboard action-card visual language: compact colored icon tile, bordered card, hover lift and responsive grid.
- Added per-admin usage tracking so frequently used Quick Actions automatically move to the top.
- Added a server-validated same-origin tracking endpoint and a SECURITY DEFINER RPC guarded by `is_admin()`.
- Dynamic per-user pages remain accessed through the parent module such as Users; item-level approve/reject controls remain inside their contextual review pages.

## Database

New migration:

`supabase/migrations/0052_admin_quick_action_usage.sql`

Creates:
- `admin_quick_action_usage`
- `record_admin_quick_action_use(text)`

The migration must be applied to Supabase before the new Admin Dashboard Quick Actions are used in production.

## Main files

- `src/lib/admin-quick-actions.ts`
- `src/components/admin/admin-quick-actions.tsx`
- `src/components/admin/admin-quick-actions-client.tsx`
- `src/app/api/admin/quick-actions/[actionKey]/route.ts`
- `src/app/admin/page.tsx`
- `src/types/database.types.ts`

## Behavior

All configured admin controls remain visible. Usage ranking changes only the order; no action is removed because it is rarely used.

## Validation

Run locally with installed dependencies:

```bash
npx tsc --noEmit
npm run build
npm run verify
npm run production-audit
```
