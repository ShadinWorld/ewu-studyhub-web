-- Phase 3B: allow manually promoted seller accounts to request payouts.
-- Fixes the mismatch where the dashboard accepts role = seller, but the
-- previous request_seller_payout() RPC only checked is_seller = true.
-- Run this migration in Supabase SQL Editor after migrations 0001-0009.

create or replace function request_seller_payout(p_amount_cents integer)
returns uuid as $$
declare
  uid uuid := auth.uid();
  payout_id uuid;
  balance bigint;
  bkash text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- A user is a seller when either flag is true. This supports accounts
  -- manually promoted by an admin (role = seller) as well as legacy accounts
  -- that use is_seller = true.
  select wallet_balance_cents
    into balance
  from profiles
  where id = uid
    and (is_seller = true or role = 'seller'::user_role);

  if balance is null then
    raise exception 'Seller account not found';
  end if;

  if p_amount_cents <= 0 or p_amount_cents > balance then
    raise exception 'Invalid payout amount';
  end if;

  select bkash_number
    into bkash
  from seller_payment_settings
  where seller_id = uid;

  if bkash is null then
    raise exception 'Add your bKash number first';
  end if;

  insert into payouts (
    seller_id,
    amount_cents,
    status,
    payment_method,
    payment_account_number
  )
  values (
    uid,
    p_amount_cents,
    'pending',
    'bkash',
    bkash
  )
  returning id into payout_id;

  return payout_id;
end;
$$ language plpgsql security definer set search_path = public;
