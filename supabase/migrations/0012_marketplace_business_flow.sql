-- Phase 3C: production-ready marketplace business flow.
-- Adds seller bKash onboarding, minimum payout enforcement, purchase
-- notifications, and stronger duplicate-purchase protection.

alter table profiles
  add column if not exists seller_bkash_number text
  check (seller_bkash_number is null or seller_bkash_number ~ '^01[0-9]{9}$');


-- Seller onboarding: collect the payout number together with the seller request.
create or replace function request_seller_verification(
  p_university_email text,
  p_bkash_number text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized_email text := lower(trim(p_university_email));
  normalized_bkash text := trim(p_bkash_number);
  student_id_value text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if normalized_email !~ '^[0-9]{4}-[0-9]-[0-9]{2}-[0-9]{3}@std\.ewubd\.edu$' then
    raise exception 'Enter a valid EWU student email.';
  end if;

  if normalized_bkash !~ '^01[0-9]{9}$' then
    raise exception 'Enter a valid 11-digit bKash number.';
  end if;

  if exists (
    select 1 from profiles
    where lower(university_email) = normalized_email
      and id <> uid
  ) then
    raise exception 'This EWU student ID is already registered to another account.';
  end if;

  student_id_value := split_part(normalized_email, '@', 1);

  update profiles
  set university_email = normalized_email,
      student_id = student_id_value,
      seller_bkash_number = normalized_bkash,
      student_id_verification_status = 'pending',
      updated_at = now()
  where id = uid;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

revoke all on function request_seller_verification(text, text) from public;
grant execute on function request_seller_verification(text, text) to authenticated;

-- Minimum seller payout: BDT 20.
create or replace function request_seller_payout(p_amount_cents integer)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  payout_id uuid;
  balance bigint;
  bkash text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount_cents < 2000 then
    raise exception 'Minimum payout is BDT 20.';
  end if;

  select wallet_balance_cents into balance
  from profiles
  where id = uid and (is_seller = true or role::text = 'seller');

  if balance is null then
    raise exception 'Seller account not found';
  end if;

  if p_amount_cents > balance then
    raise exception 'Payout amount exceeds your available balance.';
  end if;

  select bkash_number into bkash
  from seller_payment_settings
  where seller_id = uid;

  if bkash is null then
    raise exception 'Add your bKash number first';
  end if;

  if exists (
    select 1 from payouts
    where seller_id = uid and status in ('pending', 'processing')
  ) then
    raise exception 'You already have a payout request being processed.';
  end if;

  insert into payouts (
    seller_id, amount_cents, status, payment_method, payment_account_number
  )
  values (uid, p_amount_cents, 'pending', 'bkash', bkash)
  returning id into payout_id;

  return payout_id;
end;
$$;

-- Do not allow two active purchase requests for the same buyer/resource.
create unique index if not exists idx_one_active_purchase_per_buyer_file
  on purchases (buyer_id, file_id)
  where file_id is not null and status in ('pending', 'completed');

-- Replace the approval RPC with the business-side effects in one transaction:
-- unlock buyer, credit seller, record commission, and notify both sides.
create or replace function approve_manual_bkash_purchase(p_purchase_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
    f.seller_id, 'purchase', seller_earning, p_purchase_id,
    'Earning from approved bKash purchase'
  );

  update profiles
  set wallet_balance_cents = wallet_balance_cents + seller_earning,
      updated_at = now()
  where id = f.seller_id;


  insert into notifications (profile_id, type, title, body, link)
  values
    (
      p.buyer_id,
      'purchase_completed',
      'Payment approved — resource unlocked',
      coalesce(f.title, 'Your resource') || ' is now available. You can view or download it.',
      '/files/' || f.id::text
    ),
    (
      f.seller_id,
      'purchase_completed',
      'You made a sale',
      coalesce(f.title, 'Your resource') || ' was purchased. Your earning is ' ||
        to_char(seller_earning / 100.0, 'FM999999990.00') || ' BDT.',
      '/dashboard'
    );
end;
$$;

create or replace function reject_manual_bkash_purchase(
  p_purchase_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p purchases%rowtype;
  f files%rowtype;
  reason text := nullif(trim(p_reason), '');
begin
  if not is_admin() then raise exception 'Not authorized'; end if;

  select * into p from purchases where id = p_purchase_id for update;
  if p.id is null then raise exception 'Purchase not found'; end if;
  if p.status <> 'pending' then raise exception 'Purchase is not pending'; end if;

  select * into f from files where id = p.file_id;

  update purchases
  set status = 'failed',
      rejection_reason = coalesce(reason, 'Payment could not be verified.'),
      approved_at = null,
      approved_by = null
  where id = p_purchase_id;

  if p.buyer_id is not null then
    insert into notifications (profile_id, type, title, body, link)
    values (
      p.buyer_id,
      'report_update',
      'Payment rejected',
      coalesce(f.title, 'Your resource') || ': ' || coalesce(reason, 'Payment could not be verified.') ||
        ' You can submit a new payment from the resource page.',
      case when f.id is null then '/purchases' else '/files/' || f.id::text end
    );
  end if;
end;
$$;

create or replace function complete_seller_payout(p_payout_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p payouts%rowtype;
  balance bigint;
  seller_name text;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;

  select * into p from payouts where id = p_payout_id for update;
  if p.id is null then raise exception 'Payout not found'; end if;
  if p.status <> 'pending' then raise exception 'Payout is not pending'; end if;
  if p.amount_cents < 2000 then raise exception 'Minimum payout is BDT 20.'; end if;

  select wallet_balance_cents, full_name into balance, seller_name
  from profiles where id = p.seller_id for update;

  if coalesce(balance, 0) < p.amount_cents then
    raise exception 'Seller balance is insufficient';
  end if;

  update payouts set status = 'completed', processed_at = now() where id = p_payout_id;

  insert into wallet_transactions (profile_id, type, amount_cents, description)
  values (p.seller_id, 'payout', -p.amount_cents, 'Manual bKash payout completed');

  update profiles
  set wallet_balance_cents = wallet_balance_cents - p.amount_cents,
      updated_at = now()
  where id = p.seller_id;

  insert into notifications (profile_id, type, title, body, link)
  values (
    p.seller_id,
    'payout_completed',
    'Payout completed',
    'Your ' || to_char(p.amount_cents / 100.0, 'FM999999990.00') ||
      ' BDT payout was sent to your saved bKash number.',
    '/dashboard/payment-settings'
  );
end;
$$;

-- Notify all admins that a new payment needs manual review.
create or replace function notify_admins_of_pending_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resource_title text;
begin
  if new.status = 'pending' and new.payment_method = 'bkash' then
    select title into resource_title from files where id = new.file_id;
    insert into notifications (profile_id, type, title, body, link)
    select id,
           'report_update',
           'New bKash payment needs review',
           coalesce(resource_title, 'A resource') || ' has a new payment request.',
           '/admin/payments'
    from profiles
    where role in ('admin', 'super_admin');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_admins_pending_purchase on purchases;
create trigger trg_notify_admins_pending_purchase
after insert on purchases
for each row execute function notify_admins_of_pending_purchase();
