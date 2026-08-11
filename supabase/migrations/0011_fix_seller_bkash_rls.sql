-- Phase 3B: fix seller bKash save for manually promoted seller accounts.
-- Run this in Supabase SQL Editor after migrations 0001-0010.
--
-- The UI accepts both is_seller = true and role = 'seller'. The old action
-- wrote directly to seller_payment_settings, which can fail when the deployed
-- RLS policies are missing/out of sync. This RPC performs the seller check in
-- the database and writes the row with SECURITY DEFINER.

create or replace function save_seller_bkash_number(p_bkash_number text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized text := trim(p_bkash_number);
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if normalized !~ '^01[0-9]{9}$' then
    raise exception 'Enter a valid 11-digit bKash number';
  end if;

  if not exists (
    select 1
    from profiles
    where id = uid
      and (is_seller = true or role::text = 'seller')
  ) then
    raise exception 'Seller account not found';
  end if;

  insert into seller_payment_settings (seller_id, bkash_number, updated_at)
  values (uid, normalized, now())
  on conflict (seller_id)
  do update set
    bkash_number = excluded.bkash_number,
    updated_at = now();
end;
$$;

revoke all on function save_seller_bkash_number(text) from public;
grant execute on function save_seller_bkash_number(text) to authenticated;

-- Keep direct reads available to the seller and admins even if an older
-- deployment has an incomplete/missing policy from migration 0008.
drop policy if exists "sellers manage own payment settings" on seller_payment_settings;

create policy "sellers manage own payment settings"
  on seller_payment_settings
  for all
  to authenticated
  using (seller_id = auth.uid() or is_admin())
  with check (seller_id = auth.uid() or is_admin());
