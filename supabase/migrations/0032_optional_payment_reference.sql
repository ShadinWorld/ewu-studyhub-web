-- EWU StudyHub: bKash transaction reference is optional.
-- Users can submit a payment request using only their bKash number.
-- Keep the database policy aligned with the checkout UI/server action.

drop policy if exists "buyers create legitimate pending purchases" on public.purchases;

create policy "buyers create legitimate pending purchases"
  on public.purchases for insert
  with check (
    buyer_id = auth.uid()
    and file_id is not null
    and bundle_id is null
    and status = 'pending'
    and payment_method = 'bkash'
    and commission_cents = 0
    and seller_earning_cents = 0
    and payment_submitted_at is not null
    and buyer_bkash_number ~ '^01[0-9]{9}$'
    and (
      payment_reference is null
      or char_length(trim(payment_reference)) = 0
      or char_length(trim(payment_reference)) between 6 and 100
    )
    and exists (
      select 1
      from public.files f
      where f.id = purchases.file_id
        and f.visibility = 'published'
        and f.pricing_type = 'paid'
        and f.seller_id <> auth.uid()
        and f.price_cents = purchases.amount_cents
    )
  );
