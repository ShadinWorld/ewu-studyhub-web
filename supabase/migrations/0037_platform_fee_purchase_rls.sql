-- EWU StudyHub: align purchase INSERT RLS with fixed platform-fee pricing.
-- Seller price remains the seller earning; platform fee is added on top for the buyer.

drop policy if exists "buyers create legitimate pending purchases" on public.purchases;
drop policy if exists "buyers create own purchases" on public.purchases;

create policy "buyers create legitimate pending purchases"
  on public.purchases for insert
  with check (
    buyer_id = auth.uid()
    and file_id is not null
    and bundle_id is null
    and status = 'pending'
    and payment_method = 'bkash'
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
        and purchases.amount_cents = public.get_resource_buyer_price(f.id)
        and purchases.seller_earning_cents = f.price_cents
        and purchases.commission_cents = public.get_resource_buyer_price(f.id) - f.price_cents
    )
  );
