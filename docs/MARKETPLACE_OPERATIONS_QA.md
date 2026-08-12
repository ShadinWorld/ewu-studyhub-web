# EWU StudyHub Marketplace Operations QA

## Critical end-to-end checks

1. Student opens a paid resource and submits a valid bKash number + transaction ID.
2. The purchase becomes `pending`; the student cannot submit a second active purchase for the same resource.
3. Admin receives a notification and sees buyer, sender bKash, transaction ID, resource, seller and seller bKash in `/admin/payments`.
4. Admin approval atomically completes the purchase, records 20% commission / 80% seller earning, credits seller wallet, and notifies buyer + seller.
5. Approved buyer can View and Download; unapproved users are redirected to checkout.
6. Admin rejection records a reason, notifies the buyer, and allows a new payment submission.
7. Seller sees the completed sale, gross amount, 20% commission and 80% earning at `/dashboard/sales`.
8. Seller requests payout only when bKash is saved and balance is at least BDT 20.
9. Admin receives a payout-request notification and can Mark paid or Reject.
10. Completed payout debits seller wallet once and notifies the seller.
11. Rejected payout does not debit the seller wallet and records a failed payout.
12. Notifications show unread state, allow individual read and mark-all-read, and link to the relevant screen.

## Production verification

Run after applying migrations:

```bash
npx tsc --noEmit
npm run build
```

Then repeat the flow in the deployed Vercel environment using a real test student, seller and admin account. Do not use production money for QA.
