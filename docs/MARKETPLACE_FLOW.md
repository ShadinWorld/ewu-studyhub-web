# EWU StudyHub — Marketplace Business Flow

## Student purchase flow
1. Student opens a paid resource.
2. The resource page checks the student's latest purchase state.
3. `pending` → the page clearly shows **Payment pending** and disables buying again.
4. `failed` → the page shows **Payment rejected**, displays the admin reason, and allows a new payment.
5. `completed` → the page shows **Payment approved** and gives direct **View resource** / **Download** actions.
6. The database prevents more than one active (`pending`/`completed`) purchase for the same student/resource.

## Manual bKash flow
1. Student sends the exact resource price to the platform bKash number.
2. Student submits their bKash number + transaction ID.
3. Purchase is stored as `pending`.
4. Admin receives a notification and sees the request under **Admin → Payments**.
5. Admin verifies the transaction manually.
6. Approve: buyer gets access, seller wallet is credited, 20% default platform commission is recorded, and both sides receive notifications.
7. Reject: buyer gets the rejection reason and can retry from the resource page.

## Seller onboarding
- Seller requests verification with EWU student email + payout bKash number.
- Admin sees the bKash number in the seller approval queue.
- Approval automatically saves the submitted bKash number to seller payout settings.
- Sellers can later change the payout number from **Payment Settings**.

## Seller payout
- Minimum payout: **BDT 20**.
- Only one pending/processing payout can exist at a time.
- Seller requests payout from the wallet balance.
- Admin pays the saved bKash number manually, then clicks **Mark paid**.
- The wallet is debited atomically and the seller receives a payout-completed notification.

## Notifications
Students, sellers and admins have an in-app Notifications page. Payment approvals/rejections, seller approval/rejection, pending payment review and completed payouts are surfaced there with direct links to the relevant page.
