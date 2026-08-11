-- Phase 3A: marketplace security hardening.
-- Run this migration in Supabase SQL Editor after migrations 0001-0008.

-- -----------------------------------------------------------------------------
-- 1) Profiles: never expose sensitive profile fields to anonymous/public reads.
-- Public seller/reviewer display data is served through the server's service-role
-- client, selecting only safe display fields. Authenticated users can still read
-- their own profile; admins can read all profiles.
-- -----------------------------------------------------------------------------
drop policy if exists "profiles are publicly readable" on profiles;
drop policy if exists "users can read own profile" on profiles;

create policy "users can read own profile"
  on profiles for select using (auth.uid() = id or is_admin());

-- -----------------------------------------------------------------------------
-- 2) Purchases: a normal client may only create a legitimate pending bKash
-- purchase for a currently-published paid file at the exact database price.
-- Approval/comission fields remain zero until the admin-only RPC approves it.
-- This prevents a client from inserting a completed/underpriced purchase row.
-- -----------------------------------------------------------------------------
drop policy if exists "buyers create own purchases" on purchases;

create policy "buyers create legitimate pending purchases"
  on purchases for insert
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
    and char_length(trim(coalesce(payment_reference, ''))) between 6 and 100
    and exists (
      select 1
      from files f
      where f.id = purchases.file_id
        and f.visibility = 'published'
        and f.pricing_type = 'paid'
        and f.seller_id <> auth.uid()
        and f.price_cents = purchases.amount_cents
    )
  );

-- -----------------------------------------------------------------------------
-- 3) Files: sellers may edit their own resource metadata, but cannot change
-- seller_id or move a resource between visibility states. Only admins can
-- publish/reject/archive resources.
-- -----------------------------------------------------------------------------
create or replace function seller_can_update_file(
  p_file_id uuid,
  p_seller_id uuid,
  p_visibility file_visibility
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from files f
    where f.id = p_file_id
      and f.seller_id = p_seller_id
      and f.visibility = p_visibility
  );
$$;

drop policy if exists "sellers can update own files" on files;

create policy "sellers can update own file metadata"
  on files for update
  using (seller_id = auth.uid() or is_admin())
  with check (
    is_admin()
    or (
      seller_id = auth.uid()
      and seller_can_update_file(id, auth.uid(), visibility)
    )
  );

-- -----------------------------------------------------------------------------
-- 4) Extra database-level guardrails for purchase rows.
-- Existing admin approval/rejection RPCs remain the only path that changes the
-- status from pending and populates commission/seller earnings.
-- -----------------------------------------------------------------------------
create or replace function prevent_buyer_purchase_tampering()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin() then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    raise exception 'Purchase updates are restricted to administrators';
  end if;

  return new;
end;
$$;

drop trigger if exists purchases_prevent_buyer_update on purchases;
create trigger purchases_prevent_buyer_update
before update on purchases
for each row execute function prevent_buyer_purchase_tampering();

-- Prevent ordinary clients from deleting purchase records. Admin/service-role
-- workflows can still perform maintenance when needed.
drop policy if exists "buyers can delete own purchases" on purchases;
