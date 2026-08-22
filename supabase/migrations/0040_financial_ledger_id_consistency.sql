-- EWU StudyHub: financial ledger ID consistency and payout safety.
-- Purchase ID is the canonical sale ID. Every wallet entry may also point to the exact payout.

alter table public.wallet_transactions
  add column if not exists related_payout_id uuid references public.payouts(id) on delete set null;

create index if not exists idx_wallet_transactions_related_payout
  on public.wallet_transactions(related_payout_id) where related_payout_id is not null;

create unique index if not exists idx_wallet_transactions_one_payout_per_payout
  on public.wallet_transactions(related_payout_id)
  where related_payout_id is not null and type = 'payout';

-- Strengthen payout completion so one payout has one immutable payout-ledger entry.
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
begin
  if not is_admin() then raise exception 'Not authorized'; end if;

  select * into p from payouts where id = p_payout_id for update;
  if p.id is null then raise exception 'Payout not found'; end if;
  if p.status <> 'pending' then raise exception 'Payout is not pending'; end if;
  if p.amount_cents <= 0 then raise exception 'Payout amount must be positive'; end if;

  select coalesce(sum(coalesce(pc.seller_earning_cents, greatest(0, pc.amount_cents - pc.commission_cents))),0)
  into seller_earnings
  from purchases pc join files fc on fc.id = pc.file_id
  where fc.seller_id = p.seller_id and pc.status = 'completed' and fc.pricing_type = 'paid';

  select coalesce(sum(amount_cents),0) into completed_paid from payouts where seller_id=p.seller_id and status='completed';
  select coalesce(sum(amount_cents),0) into other_pending_paid from payouts where seller_id=p.seller_id and status in ('pending','processing') and id<>p.id;
  available_balance := greatest(0, seller_earnings - completed_paid - other_pending_paid);
  if p.amount_cents > available_balance then raise exception 'Seller balance is insufficient'; end if;

  update payouts set status='completed', processed_at=now() where id=p_payout_id;

  insert into wallet_transactions(profile_id,type,amount_cents,related_purchase_id,related_payout_id,description)
  values(p.seller_id,'payout',-p.amount_cents,p.related_purchase_id,p.id,'Automatic bKash payout completed')
  on conflict (related_payout_id) where related_payout_id is not null and type = 'payout' do nothing;

  remaining_balance := greatest(0, seller_earnings - completed_paid - p.amount_cents - other_pending_paid);
  update profiles set wallet_balance_cents=remaining_balance,updated_at=now() where id=p.seller_id;

  insert into notifications(profile_id,type,title,body,link)
  values(p.seller_id,'payout_completed','Payout completed','Your ' || to_char(p.amount_cents / 100.0,'FM999999990.00') || ' BDT automatic payout was marked as paid by StudyHub admin.','/dashboard/payment-settings');
end;
$$;
