-- Phase 2D: manual bKash marketplace workflow.
-- No gateway credentials required. Admin verifies transaction IDs manually.

create table if not exists seller_payment_settings (
  seller_id uuid primary key references profiles(id) on delete cascade,
  bkash_number text not null check (bkash_number ~ '^[0-9]{11}$'),
  updated_at timestamptz not null default now()
);

create table if not exists platform_payment_settings (
  id boolean primary key default true check (id = true),
  bkash_number text not null check (bkash_number ~ '^[0-9]{11}$'),
  default_commission_percent numeric(5,2) not null default 20.00 check (default_commission_percent >= 0 and default_commission_percent <= 100),
  updated_at timestamptz not null default now()
);

insert into platform_payment_settings (id, bkash_number, default_commission_percent)
values (true, '01716529460', 20.00)
on conflict (id) do nothing;

alter table files add column if not exists commission_percent numeric(5,2)
  check (commission_percent is null or (commission_percent >= 0 and commission_percent <= 100));

alter table purchases add column if not exists buyer_bkash_number text;
alter table purchases add column if not exists payment_submitted_at timestamptz;
alter table purchases add column if not exists approved_at timestamptz;
alter table purchases add column if not exists approved_by uuid references profiles(id);
alter table purchases add column if not exists rejection_reason text;

alter table seller_payment_settings enable row level security;
alter table platform_payment_settings enable row level security;

create policy "sellers manage own payment settings"
  on seller_payment_settings for all
  using (seller_id = auth.uid() or is_admin())
  with check (seller_id = auth.uid() or is_admin());

create policy "platform payment number is public"
  on platform_payment_settings for select using (true);

create policy "admins manage platform payment settings"
  on platform_payment_settings for update
  using (is_admin())
  with check (is_admin());

create policy "admins update purchases"
  on purchases for update
  using (is_admin())
  with check (is_admin());

-- Atomic approval: calculates the seller/platform split from the resource override,
-- falling back to the admin-configured default. The split is never returned to buyers.
create or replace function approve_manual_bkash_purchase(p_purchase_id uuid)
returns void as $$
declare
  p purchases%rowtype;
  f files%rowtype;
  platform_percent numeric(5,2);
  seller_earning integer;
  platform_earning integer;
begin
  if not is_admin() then
    raise exception 'Not authorized';
  end if;

  select * into p from purchases where id = p_purchase_id for update;
  if p.id is null then raise exception 'Purchase not found'; end if;
  if p.status <> 'pending' then raise exception 'Purchase is not pending'; end if;
  if p.payment_method <> 'bkash' then raise exception 'Unsupported payment method'; end if;

  select * into f from files where id = p.file_id for update;
  if f.id is null then raise exception 'Resource not found'; end if;

  select coalesce(f.commission_percent, s.default_commission_percent)
    into platform_percent
    from platform_payment_settings s
    where s.id = true;

  platform_earning := round(p.amount_cents * platform_percent / 100.0);
  seller_earning := p.amount_cents - platform_earning;

  update purchases
  set status = 'completed',
      commission_cents = platform_earning,
      seller_earning_cents = seller_earning,
      approved_at = now(),
      approved_by = auth.uid(),
      rejection_reason = null
  where id = p_purchase_id;

  insert into wallet_transactions (profile_id, type, amount_cents, related_purchase_id, description)
  values (
    f.seller_id,
    'purchase',
    seller_earning,
    p_purchase_id,
    'Earning from approved bKash purchase'
  );

  update profiles
  set wallet_balance_cents = wallet_balance_cents + seller_earning,
      updated_at = now()
  where id = f.seller_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function reject_manual_bkash_purchase(p_purchase_id uuid, p_reason text)
returns void as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  update purchases
  set status = 'failed',
      rejection_reason = nullif(trim(p_reason), ''),
      approved_at = null,
      approved_by = null
  where id = p_purchase_id and status = 'pending';
  if not found then raise exception 'Purchase is not pending or does not exist'; end if;
end;
$$ language plpgsql security definer set search_path = public;

-- Seller payout approval. Admin marks a requested payout as completed only after
-- sending the money to the seller's saved bKash number.
create or replace function complete_seller_payout(p_payout_id uuid)
returns void as $$
declare
  p payouts%rowtype;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  select * into p from payouts where id = p_payout_id for update;
  if p.id is null then raise exception 'Payout not found'; end if;
  if p.status <> 'pending' then raise exception 'Payout is not pending'; end if;
  if p.amount_cents <= 0 then raise exception 'Invalid payout amount'; end if;

  update payouts set status = 'completed', processed_at = now() where id = p_payout_id;
  insert into wallet_transactions (profile_id, type, amount_cents, description)
  values (p.seller_id, 'payout', -p.amount_cents, 'Manual bKash payout completed');
  update profiles
  set wallet_balance_cents = wallet_balance_cents - p.amount_cents,
      updated_at = now()
  where id = p.seller_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function request_seller_payout(p_amount_cents integer)
returns uuid as $$
declare
  uid uuid := auth.uid();
  payout_id uuid;
  balance bigint;
  bkash text;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select wallet_balance_cents into balance from profiles where id = uid and is_seller = true;
  if balance is null then raise exception 'Seller account not found'; end if;
  if p_amount_cents <= 0 or p_amount_cents > balance then raise exception 'Invalid payout amount'; end if;
  select bkash_number into bkash from seller_payment_settings where seller_id = uid;
  if bkash is null then raise exception 'Add your bKash number first'; end if;

  insert into payouts (seller_id, amount_cents, status, payment_method, payment_account_number)
  values (uid, p_amount_cents, 'pending', 'bkash', bkash)
  returning id into payout_id;
  return payout_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function set_resource_commission(p_file_id uuid, p_commission_percent numeric)
returns void as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  if p_commission_percent is not null and (p_commission_percent < 0 or p_commission_percent > 100) then
    raise exception 'Commission must be between 0 and 100';
  end if;
  update files set commission_percent = p_commission_percent, updated_at = now() where id = p_file_id;
  if not found then raise exception 'Resource not found'; end if;
end;
$$ language plpgsql security definer set search_path = public;

-- Keep commission controls completely out of the public files row. Buyers can
-- read published file rows, so the override belongs in an admin-only table.
create table if not exists resource_commission_settings (
  file_id uuid primary key references files(id) on delete cascade,
  commission_percent numeric(5,2) not null check (commission_percent >= 0 and commission_percent <= 100),
  updated_at timestamptz not null default now()
);

alter table resource_commission_settings enable row level security;
create policy "admins manage resource commissions"
  on resource_commission_settings for all
  using (is_admin())
  with check (is_admin());

-- Move any value created by the earlier statement in this same migration.
insert into resource_commission_settings (file_id, commission_percent)
select id, commission_percent from files where commission_percent is not null
on conflict (file_id) do update set commission_percent = excluded.commission_percent, updated_at = now();

alter table files drop column if exists commission_percent;

create or replace function approve_manual_bkash_purchase(p_purchase_id uuid)
returns void as $$
declare
  p purchases%rowtype;
  f files%rowtype;
  platform_percent numeric(5,2);
  seller_earning integer;
  platform_earning integer;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  select * into p from purchases where id = p_purchase_id for update;
  if p.id is null then raise exception 'Purchase not found'; end if;
  if p.status <> 'pending' then raise exception 'Purchase is not pending'; end if;
  if p.payment_method <> 'bkash' then raise exception 'Unsupported payment method'; end if;
  select * into f from files where id = p.file_id for update;
  if f.id is null then raise exception 'Resource not found'; end if;
  select coalesce(rc.commission_percent, ps.default_commission_percent)
    into platform_percent
    from platform_payment_settings ps
    left join resource_commission_settings rc on rc.file_id = f.id
    where ps.id = true;
  platform_earning := round(p.amount_cents * platform_percent / 100.0);
  seller_earning := p.amount_cents - platform_earning;
  update purchases set status = 'completed', commission_cents = platform_earning, seller_earning_cents = seller_earning,
    approved_at = now(), approved_by = auth.uid(), rejection_reason = null where id = p_purchase_id;
  insert into wallet_transactions (profile_id, type, amount_cents, related_purchase_id, description)
    values (f.seller_id, 'purchase', seller_earning, p_purchase_id, 'Earning from approved bKash purchase');
  update profiles set wallet_balance_cents = wallet_balance_cents + seller_earning, updated_at = now() where id = f.seller_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function set_resource_commission(p_file_id uuid, p_commission_percent numeric)
returns void as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  if p_commission_percent is null then
    delete from resource_commission_settings where file_id = p_file_id;
  else
    if p_commission_percent < 0 or p_commission_percent > 100 then raise exception 'Commission must be between 0 and 100'; end if;
    insert into resource_commission_settings (file_id, commission_percent)
    values (p_file_id, p_commission_percent)
    on conflict (file_id) do update set commission_percent = excluded.commission_percent, updated_at = now();
  end if;
end;
$$ language plpgsql security definer set search_path = public;

-- Keep the public checkout number separate from private commission settings.
create table if not exists public_payment_settings (
  id boolean primary key default true check (id = true),
  bkash_number text not null check (bkash_number ~ '^[0-9]{11}$'),
  updated_at timestamptz not null default now()
);
insert into public_payment_settings (id, bkash_number)
select true, bkash_number from platform_payment_settings where id = true
on conflict (id) do update set bkash_number = excluded.bkash_number, updated_at = now();

alter table public_payment_settings enable row level security;
create policy "checkout bKash number is public"
  on public_payment_settings for select using (true);
create policy "admins update public bKash number"
  on public_payment_settings for update using (is_admin()) with check (is_admin());

drop policy if exists "platform payment number is public" on platform_payment_settings;

-- Keep platform settings synchronized when admin changes the bKash number.
create or replace function update_platform_payment_settings(p_bkash_number text, p_default_commission_percent numeric)
returns void as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  if p_bkash_number !~ '^01[0-9]{9}$' then raise exception 'Invalid bKash number'; end if;
  if p_default_commission_percent < 0 or p_default_commission_percent > 100 then raise exception 'Commission must be between 0 and 100'; end if;
  update platform_payment_settings set bkash_number = p_bkash_number, default_commission_percent = p_default_commission_percent, updated_at = now() where id = true;
  update public_payment_settings set bkash_number = p_bkash_number, updated_at = now() where id = true;
end;
$$ language plpgsql security definer set search_path = public;
create policy "admins read platform payment settings"
  on platform_payment_settings for select using (is_admin());

create or replace function complete_seller_payout(p_payout_id uuid)
returns void as $$
declare
  p payouts%rowtype;
  balance bigint;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  select * into p from payouts where id = p_payout_id for update;
  if p.id is null then raise exception 'Payout not found'; end if;
  if p.status <> 'pending' then raise exception 'Payout is not pending'; end if;
  select wallet_balance_cents into balance from profiles where id = p.seller_id for update;
  if coalesce(balance, 0) < p.amount_cents then raise exception 'Seller balance is insufficient'; end if;
  update payouts set status = 'completed', processed_at = now() where id = p_payout_id;
  insert into wallet_transactions (profile_id, type, amount_cents, description)
    values (p.seller_id, 'payout', -p.amount_cents, 'Manual bKash payout completed');
  update profiles set wallet_balance_cents = wallet_balance_cents - p.amount_cents, updated_at = now() where id = p.seller_id;
end;
$$ language plpgsql security definer set search_path = public;
