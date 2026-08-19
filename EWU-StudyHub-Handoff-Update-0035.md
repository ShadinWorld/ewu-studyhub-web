# EWU StudyHub — Handoff Update 0035

Date: 2026-08-19

## Scope completed

Implemented the confirmed sensitive-request visibility flow plus the latest upload/departments UX fixes.

### 1. Sensitive request center

Added a dedicated `/requests` page, surfaced as **My Requests** from both student and seller dashboards and from Notifications.

Seller accounts can see:
- Seller Verification
- Resource Approval
- Payout Request
- Purchase Request / sale activity

Student accounts can see:
- Seller Verification
- Purchase Request

Each request card shows the request type, reference/resource, submitted time, current status, amount where applicable, admin/rejection detail where available, and a direct action link. Mobile layout is stacked and touch-friendly.

### 2. Notifications request subsection

Notifications now has a dedicated **Requests** filter for sensitive workflow messages. The action-status area also keeps relevant submitted/approved/rejected/completed messages visible.

### 3. Purchase-request confirmation/status flow

Submitting a manual bKash purchase now creates a `purchase_pending` notification for both the buyer and the seller. The buyer's existing checkout status page also exposes a direct **View My Requests** action.

Admin approval/rejection continues to use the existing purchase workflow and notifications.

### 4. Resource upload status visibility

Seller upload cards now explicitly show:
- **Admin approval pending** for draft uploads
- **Approved & live** for published uploads
- **Rejected by admin** for rejected uploads

Existing rejection reasons remain visible.

### 5. Course auto-fill during upload

In **Find your course**, typing an exact course code such as `CSE 103` now immediately matches the catalog and fills both the Department and Course fields. An **Auto-selected** confirmation line appears under the search. Clearing the search also clears the selected course and department.

### 6. Department card readability

Improved department card internal layout for desktop and phone widths:
- larger stable card height
- full department name wrapping instead of clipping
- less aggressive short-name truncation
- safer wrapping for course/resource counts
- better reserved space for the active-resource label
- preserved icon/action alignment

## Validation

Source-level inspection completed successfully for the changed paths.

`npm run type-check` remains blocked by the ZIP's incomplete dependency tree (`@supabase/ssr`, `@supabase/supabase-js`, `next/headers`, React JSX typings and Node typings are unavailable in the uploaded environment). A dependency restore attempt with `npm ci --ignore-scripts` timed out before completion.

No existing migration data model was duplicated for request status. The new request page derives current state from the source-of-truth tables (`profiles`, `files`, `purchases`, `payouts`) and uses notifications for human-facing confirmation/decision messages.

## Files touched in this update

- `src/app/requests/page.tsx`
- `src/components/requests/my-requests-list.tsx`
- `src/components/upload/upload-form.tsx`
- `src/components/departments/department-card.tsx`
- `src/components/notifications/notification-list.tsx`
- `src/app/notifications/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/checkout/[fileId]/actions.ts`
- `src/app/checkout/[fileId]/page.tsx`
- `src/components/files/my-uploads-list.tsx`
- `supabase/migrations/0025_sensitive_request_notifications.sql`

## Next focus

Continue from this update. Do not restore removed features. Verify the live Supabase migration state and run full production validation after dependencies are restored locally.
