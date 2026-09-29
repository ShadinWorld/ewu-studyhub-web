# EWU StudyHub Update 0051 — Download, View Count & Admin Activity Controls

## Download
- Protected downloads still require the existing authentication, ownership or completed-purchase checks.
- The server now creates a short-lived Supabase signed URL with download disposition and redirects the browser to Storage instead of proxying the full file through Next.js.
- The browser can therefore save the file through its normal local Downloads flow.
- Download counting and watermark audit insertion remain server-side.

## EWU Student ID verification
- The manual Seller verification example now uses `2025-3-60-010@std.ewubd.edu`.
- The verification rule itself was not loosened or changed by this UI update.

## Activity history
- Normal Student/Seller users no longer have a user-facing Activity History route or menu item.
- Home-page Recent Activity was removed from the user-facing Home.
- Admin Users now has an Activity History action for each user and a dedicated per-user activity page.
- `user_activity_history` SELECT access is now Admin-only at the RLS layer.
- Existing activity recording continues through the controlled `record_user_activity()` function.

## View count
- Resource view tracking is now server-side deduplicated with a 30-minute window per authenticated user or anonymous viewer cookie.
- Client sessionStorage is no longer the authority for view counting.
- Re-renders/duplicate effect calls do not create additional views inside the dedupe window.

## Files touched
- `src/app/api/files/[id]/download/route.ts`
- `src/app/api/files/[id]/track-view/route.ts`
- `src/components/files/resource-view-tracker.tsx`
- `src/components/dashboard/become-seller-form.tsx`
- `src/components/layout/user-menu.tsx`
- `src/components/ux/contextual-help.tsx`
- `src/components/homepage/admin-home-actions.tsx`
- `src/app/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/history/page.tsx`
- `src/app/admin/users/page.tsx`
- `src/app/admin/users/[id]/page.tsx`
- `src/app/admin/users/[id]/activity/page.tsx`
- `src/types/database.types.ts`
- `supabase/migrations/0051_download_view_and_admin_activity_controls.sql`
- `.ai/*` handoff/context/changelog files
