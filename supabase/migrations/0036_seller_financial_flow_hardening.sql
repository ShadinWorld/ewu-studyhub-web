-- EWU StudyHub: harden the seller financial side of purchase approval.
-- This migration keeps the current marketplace design: approving a purchase
-- credits the seller wallet, records the wallet transaction and creates a
-- pending payout automatically. It is idempotent because purchase approval
-- only processes rows that are still pending.

create or replace function public.approve_manual_bkash_purchase(p_purchase_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p purchases%rowtype;
  f files%rowtype;
  platform_type text;
  platform_percent numeric(5,2);
  fixed_fee integer;
  seller_earning integer;
  platform_earning integer;
  seller_bkash text;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;

  select * into p from purchases where id = p_purchase_id for update;
  if p.id is null then raise exception 'Purchase not found'; end if;
  if p.status <> 'pending' then raise exception 'Purchase is not pending'; end if;
  if p.payment_method <> 'bkash' then raise exception 'Unsupported payment method'; end if;

  select * into f from files where id = p.file_id for update;
  if f.id is null then raise exception 'Resource not found'; end if;
  if f.seller_id is null then raise exception 'Resource seller not found'; end if;

  select commission_type, default_commission_percent, default_commission_amount_cents
    into platform_type, platform_percent, fixed_fee
    from platform_payment_settings
   where id = true;

  if coalesce(platform_type, 'percentage') = 'fixed_amount' then
    platform_earning := least(coalesce(fixed_fee, 0), p.amount_cents);
  else
    platform_earning := round(p.amount_cents * coalesce(platform_percent, 0) / 100.0);
  end if;

  seller_earning := greatest(0, p.amount_cents - platform_earning);

  update purchases
     set status = 'completed',
         commission_cents = platform_earning,
         seller_earning_cents = seller_earning,
         approved_at = now(),
         approved_by = auth.uid(),
         rejection_reason = null
   where id = p_purchase_id;

  if seller_earning > 0 then
    insert into wallet_transactions (profile_id, type, amount_cents, related_purchase_id, description)
    values (f.seller_id, 'purchase', seller_earning, p_purchase_id, 'Earning from approved bKash purchase');

    update profiles
       set wallet_balance_cents = coalesce(wallet_balance_cents, 0) + seller_earning,
           updated_at = now()
     where id = f.seller_id;
  end if;

  select coalesce(sps.bkash_number, pr.seller_bkash_number)
    into seller_bkash
    from profiles pr
    left join seller_payment_settings sps on sps.seller_id = pr.id
   where pr.id = f.seller_id;

  if seller_earning > 0 then
    insert into payouts (seller_id, amount_cents, status, payment_method, payment_account_number)
    values (f.seller_id, seller_earning, 'pending', 'bkash', seller_bkash);
  end if;

  insert into notifications(profile_id, type, title, body, link)
  values
    (p.buyer_id, 'purchase_completed', 'Payment approved — resource unlocked',
      coalesce(f.title, 'Your resource') || ' is now available. You can view or download it.',
      '/purchases/' || p.id::text),
    (f.seller_id, 'purchase_completed', 'You made a sale',
      coalesce(f.title, 'Your resource') || ' was purchased. Your earning is ' ||
      to_char(seller_earning / 100.0, 'FM999999990.00') || ' BDT. Check Sales & Earnings for the transaction.',
      '/dashboard/sales/' || p.id::text);
end;
$$;

grant execute on function public.approve_manual_bkash_purchase(uuid) to authenticated;

-- A safe admin-only repair helper for an already-completed purchase that was
-- approved before the hardened function was applied. It inserts missing seller
-- wallet/payout records only when they do not already exist for that purchase.
create or replace function public.reconcile_completed_purchase_financials(p_purchase_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p purchases%rowtype;
  f files%rowtype;
  seller_bkash text;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  select * into p from purchases where id = p_purchase_id for update;
  if p.id is null then raise exception 'Purchase not found'; end if;
  if p.status <> 'completed' then raise exception 'Purchase is not completed'; end if;
  select * into f from files where id = p.file_id for update;
  if f.id is null then raise exception 'Resource not found'; end if;
  if p.seller_earning_cents <= 0 then return; end if;

  if not exists (select 1 from wallet_transactions where related_purchase_id = p.id and profile_id = f.seller_id and type = 'purchase') then
    insert into wallet_transactions(profile_id, type, amount_cents, related_purchase_id, description)
    values(f.seller_id, 'purchase', p.seller_earning_cents, p.id, 'Reconciled seller earning from approved bKash purchase');
    update profiles set wallet_balance_cents = coalesce(wallet_balance_cents, 0) + p.seller_earning_cents, updated_at = now() where id = f.seller_id;
  end if;

  select coalesce(sps.bkash_number, pr.seller_bkash_number)
    into seller_bkash
    from profiles pr
    left join seller_payment_settings sps on sps.seller_id = pr.id
   where pr.id = f.seller_id;

  if not exists (select 1 from payouts where seller_id = f.seller_id and amount_cents = p.seller_earning_cents and created_at >= coalesce(p.approved_at, p.created_at) and created_at <= coalesce(p.approved_at, p.created_at) + interval '5 minutes') then
    insert into payouts(seller_id, amount_cents, status, payment_method, payment_account_number)
    values(f.seller_id, p.seller_earning_cents, 'pending', 'bkash', seller_bkash);
  end if;
end;
$$;

grant execute on function public.reconcile_completed_purchase_financials(uuid) to authenticated;
