-- EWU StudyHub: automatic seller payouts, fixed/percentage commission,
-- admin messaging, user status/profile controls, resource table of contents,
-- storage monitoring and cleanup candidates.

alter table public.platform_payment_settings
  add column if not exists commission_type text not null default 'percentage'
    check (commission_type in ('percentage','fixed_amount'));

alter table public.platform_payment_settings
  add column if not exists default_commission_amount_cents integer not null default 0
    check (default_commission_amount_cents >= 0);

alter table public.profiles
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active','restricted','suspended','banned'));

alter table public.profiles
  add column if not exists name_changed_at timestamptz;

alter table public.files
  add column if not exists table_of_contents text;

create table if not exists public.admin_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  admin_id uuid not null references public.profiles(id),
  subject text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_admin_messages_user_created
  on public.admin_messages(user_id, created_at desc);
create index if not exists idx_admin_messages_created
  on public.admin_messages(created_at desc);

alter table public.admin_messages enable row level security;
drop policy if exists "users read own admin messages" on public.admin_messages;
create policy "users read own admin messages"
  on public.admin_messages for select
  using (user_id = auth.uid() or is_admin());
drop policy if exists "admins create admin messages" on public.admin_messages;
create policy "admins create admin messages"
  on public.admin_messages for insert
  with check (is_admin() and admin_id = auth.uid());
drop policy if exists "users mark own admin messages read" on public.admin_messages;
create policy "users mark own admin messages read"
  on public.admin_messages for update
  using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- Automatically create a seller payout when a purchase is approved.
-- Seller no longer needs to submit a separate payout request.
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
  payout_id uuid;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;

  select * into p from purchases where id = p_purchase_id for update;
  if p.id is null then raise exception 'Purchase not found'; end if;
  if p.status <> 'pending' then raise exception 'Purchase is not pending'; end if;
  if p.payment_method <> 'bkash' then raise exception 'Unsupported payment method'; end if;

  select * into f from files where id = p.file_id for update;
  if f.id is null then raise exception 'Resource not found'; end if;

  select commission_type, default_commission_percent, default_commission_amount_cents
    into platform_type, platform_percent, fixed_fee
    from platform_payment_settings where id = true;

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

  insert into wallet_transactions (profile_id, type, amount_cents, related_purchase_id, description)
  values (f.seller_id, 'purchase', seller_earning, p_purchase_id, 'Earning from approved bKash purchase');

  update profiles
  set wallet_balance_cents = wallet_balance_cents + seller_earning,
      updated_at = now()
  where id = f.seller_id;

  select coalesce(sps.bkash_number, pr.seller_bkash_number)
    into seller_bkash
    from profiles pr
    left join seller_payment_settings sps on sps.seller_id = pr.id
    where pr.id = f.seller_id;

  -- A zero earning is allowed for a fully-fee'd sale, but no zero-value payout is created.
  if seller_earning > 0 then
    insert into payouts (seller_id, amount_cents, status, payment_method, payment_account_number)
    values (f.seller_id, seller_earning, 'pending', 'bkash', seller_bkash)
    returning id into payout_id;
  end if;

  insert into notifications(profile_id, type, title, body, link)
  values
    (p.buyer_id, 'purchase_completed', 'Payment approved — resource unlocked',
      coalesce(f.title, 'Your resource') || ' is now available. You can view or download it.',
      '/files/' || f.id::text),
    (f.seller_id, 'purchase_completed', 'You made a sale',
      coalesce(f.title, 'Your resource') || ' was purchased. Your earning is ' ||
      to_char(seller_earning / 100.0, 'FM999999990.00') || ' BDT. A payout has been created automatically.',
      '/dashboard');
end;
$$;

-- Admin can configure percentage or fixed amount commission.
create or replace function public.update_platform_payment_settings(
  p_bkash_number text,
  p_commission_type text,
  p_default_commission_percent numeric,
  p_default_commission_amount_cents integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  if p_bkash_number !~ '^01[0-9]{9}$' then raise exception 'Invalid bKash number'; end if;
  if p_commission_type not in ('percentage','fixed_amount') then raise exception 'Invalid commission type'; end if;
  if p_default_commission_percent < 0 or p_default_commission_percent > 100 then raise exception 'Commission percentage must be between 0 and 100'; end if;
  if p_default_commission_amount_cents < 0 then raise exception 'Fixed commission cannot be negative'; end if;

  update platform_payment_settings
  set bkash_number = p_bkash_number,
      commission_type = p_commission_type,
      default_commission_percent = p_default_commission_percent,
      default_commission_amount_cents = p_default_commission_amount_cents,
      updated_at = now()
  where id = true;

  update public_payment_settings
  set bkash_number = p_bkash_number, updated_at = now()
  where id = true;
end;
$$;

-- User profile helpers.
create or replace function public.change_profile_name(p_full_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  previous timestamptz;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if length(trim(p_full_name)) < 2 or length(trim(p_full_name)) > 80 then raise exception 'Name must be between 2 and 80 characters'; end if;
  select name_changed_at into previous from profiles where id = uid for update;
  if previous is not null and previous > now() - interval '30 days' then
    raise exception 'You can change your name again after 30 days.';
  end if;
  update profiles set full_name = trim(p_full_name), name_changed_at = now(), updated_at = now() where id = uid;
end;
$$;

-- Storage reporting. Uses storage.objects as the source of truth.
create or replace function public.admin_storage_usage()
returns table(bucket_id text, object_count bigint, total_bytes bigint)
language sql
security definer
set search_path = public, storage
as $$
  select o.bucket_id,
         count(*)::bigint,
         coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint
  from storage.objects o
  where (auth.role() = 'service_role' or is_admin())
  group by o.bucket_id
  order by 3 desc;
$$;

create or replace function public.admin_storage_orphans(p_limit integer default 100)
returns table(bucket_id text, object_name text, object_size bigint)
language sql
security definer
set search_path = public, storage
as $$
  select o.bucket_id, o.name, coalesce((o.metadata->>'size')::bigint,0)::bigint
  from storage.objects o
  where (auth.role() = 'service_role' or is_admin())
    and o.bucket_id in ('files-private','files-preview','thumbnails','avatars','student-id-docs')
    and not exists (select 1 from files f where f.storage_path = o.name)
    and not exists (select 1 from files f where f.preview_storage_path = o.name)
    and not exists (select 1 from files f where f.thumbnail_url like '%' || o.name)
    and not exists (select 1 from profiles p where p.avatar_url like '%' || o.name)
    and not exists (select 1 from profiles p where p.student_id_document_url = o.name)
  order by o.created_at asc
  limit greatest(1, least(coalesce(p_limit,100),500));
$$;

-- Keep profile avatar URL updates server-side and auditable.
create or replace function public.update_profile_avatar(p_avatar_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  update profiles set avatar_url = nullif(trim(p_avatar_url), ''), updated_at = now() where id = auth.uid();
end;
$$;

-- Useful index for user/admin status management.
create index if not exists idx_profiles_account_status on public.profiles(account_status);
create index if not exists idx_files_toc on public.files using gin (to_tsvector('simple', coalesce(table_of_contents,'')));

-- Storage functions are called only from server-side service-role code.
revoke all on function public.admin_storage_usage() from public, anon, authenticated;
grant execute on function public.admin_storage_usage() to service_role;
revoke all on function public.admin_storage_orphans(integer) from public, anon, authenticated;
grant execute on function public.admin_storage_orphans(integer) to service_role;
