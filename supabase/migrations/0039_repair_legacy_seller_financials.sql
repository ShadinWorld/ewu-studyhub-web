-- EWU StudyHub: repair legacy completed purchases so seller payouts use
-- authoritative seller earnings even when old rows have zero seller_earning_cents.
-- Safe by design: only backfills completed paid purchases where both seller
-- earning and commission were previously zero.

update public.purchases p
set
  seller_earning_cents = least(f.price_cents, p.amount_cents),
  commission_cents = greatest(0, p.amount_cents - least(f.price_cents, p.amount_cents))
from public.files f
where p.file_id = f.id
  and p.status = 'completed'
  and f.pricing_type = 'paid'
  and coalesce(p.seller_earning_cents, 0) = 0
  and coalesce(p.commission_cents, 0) = 0
  and p.amount_cents > 0;

create or replace function public.reconcile_seller_financials()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  row_count integer := 0;
  r record;
  new_balance bigint;
begin
  if not is_admin() then
    raise exception 'Not authorized';
  end if;

  -- Backfill legacy completed paid purchases first. This preserves non-zero
  -- historical accounting values and only repairs rows where both seller
  -- earning and commission were missing.
  update purchases p
  set
    seller_earning_cents = least(f.price_cents, p.amount_cents),
    commission_cents = greatest(0, p.amount_cents - least(f.price_cents, p.amount_cents))
  from files f
  where p.file_id = f.id
    and p.status = 'completed'
    and f.pricing_type = 'paid'
    and coalesce(p.seller_earning_cents, 0) = 0
    and coalesce(p.commission_cents, 0) = 0
    and p.amount_cents > 0;

  -- Repair missing purchase wallet ledger entries without creating duplicate payouts.
  for r in
    select p.id,
           coalesce(p.seller_earning_cents, greatest(0, p.amount_cents - p.commission_cents)) as seller_earning,
           f.seller_id
    from purchases p
    join files f on f.id = p.file_id
    where p.status = 'completed'
      and coalesce(p.seller_earning_cents, greatest(0, p.amount_cents - p.commission_cents)) > 0
  loop
    if not exists (
      select 1
      from wallet_transactions w
      where w.related_purchase_id = r.id
        and w.type = 'purchase'
    ) then
      insert into wallet_transactions(profile_id, type, amount_cents, related_purchase_id, description)
      values(r.seller_id, 'purchase', r.seller_earning, r.id, 'Reconciled seller earning from approved purchase');
      row_count := row_count + 1;
    end if;
  end loop;

  -- Rebuild available seller wallet from authoritative completed earnings
  -- minus completed/pending/processing payouts.
  for r in select id from profiles where is_seller = true loop
    select greatest(
      0,
      coalesce((
        select sum(coalesce(p.seller_earning_cents, greatest(0, p.amount_cents - p.commission_cents)))
        from purchases p
        join files f on f.id = p.file_id
        where f.seller_id = r.id
          and p.status = 'completed'
          and f.pricing_type = 'paid'
      ), 0)
      - coalesce((
        select sum(amount_cents)
        from payouts po
        where po.seller_id = r.id
          and po.status in ('completed', 'pending', 'processing')
      ), 0)
    )
    into new_balance;

    update profiles
    set wallet_balance_cents = new_balance,
        updated_at = now()
    where id = r.id;
  end loop;

  return row_count;
end;
$$;

create or replace function public.complete_seller_payout(p_payout_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p payouts%rowtype;
  seller_earnings bigint;
  completed_paid bigint;
  other_pending_paid bigint;
  available_balance bigint;
  remaining_balance bigint;
  payout_earning bigint;
begin
  if not is_admin() then
    raise exception 'Not authorized';
  end if;

  select * into p
  from payouts
  where id = p_payout_id
  for update;

  if p.id is null then raise exception 'Payout not found'; end if;
  if p.status <> 'pending' then raise exception 'Payout is not pending'; end if;
  if p.amount_cents <= 0 then raise exception 'Payout amount must be positive'; end if;

  -- Prefer the purchase tied to this automatic payout. Legacy completed purchases
  -- may have seller_earning_cents=0, so derive the earning safely from amount-fee.
  if p.related_purchase_id is not null then
    select coalesce(pc.seller_earning_cents, greatest(0, pc.amount_cents - pc.commission_cents))
      into payout_earning
    from purchases pc
    join files fc on fc.id = pc.file_id
    where pc.id = p.related_purchase_id
      and fc.seller_id = p.seller_id
      and pc.status = 'completed';

    if payout_earning is not null and p.amount_cents > payout_earning then
      raise exception 'Payout amount exceeds the earning for its sale';
    end if;
  end if;

  select coalesce(sum(coalesce(pc.seller_earning_cents, greatest(0, pc.amount_cents - pc.commission_cents))), 0)
    into seller_earnings
  from purchases pc
  join files fc on fc.id = pc.file_id
  where fc.seller_id = p.seller_id
    and pc.status = 'completed'
    and fc.pricing_type = 'paid';

  select coalesce(sum(amount_cents), 0)
    into completed_paid
  from payouts
  where seller_id = p.seller_id
    and status = 'completed';

  select coalesce(sum(amount_cents), 0)
    into other_pending_paid
  from payouts
  where seller_id = p.seller_id
    and status in ('pending', 'processing')
    and id <> p.id;

  available_balance := greatest(0, seller_earnings - completed_paid - other_pending_paid);

  if p.amount_cents > available_balance then
    raise exception 'Seller balance is insufficient';
  end if;

  update payouts
  set status = 'completed',
      processed_at = now()
  where id = p_payout_id;

  if not exists (
    select 1 from wallet_transactions
    where related_purchase_id = p.related_purchase_id
      and type = 'payout'
      and profile_id = p.seller_id
      and amount_cents = -p.amount_cents
  ) then
    insert into wallet_transactions(profile_id, type, amount_cents, related_purchase_id, description)
    values(p.seller_id, 'payout', -p.amount_cents, p.related_purchase_id, 'Automatic bKash payout completed');
  end if;

  remaining_balance := greatest(0, seller_earnings - completed_paid - p.amount_cents - other_pending_paid);
  update profiles
  set wallet_balance_cents = remaining_balance,
      updated_at = now()
  where id = p.seller_id;

  insert into notifications(profile_id, type, title, body, link)
  values(
    p.seller_id,
    'payout_completed',
    'Payout completed',
    'Your ' || to_char(p.amount_cents / 100.0, 'FM999999990.00') || ' BDT automatic payout was marked as paid by StudyHub admin.',
    '/dashboard/payment-settings'
  );
end;
$$;
