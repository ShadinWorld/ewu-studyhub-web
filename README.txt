EWU StudyHub - Seller bKash RLS Fix

Replace:
src/app/dashboard/payment-settings/actions.ts

Then run this SQL in Supabase SQL Editor:
supabase/migrations/0011_fix_seller_bkash_rls.sql

After running SQL:
1. Stop dev server if needed.
2. Delete .next.
3. npm run dev
4. Seller -> Dashboard -> Payment Settings.
5. Save bKash number.
6. Refresh and confirm the number remains.
7. Request payout.

This fix supports both is_seller = true and role = 'seller'.
