-- EWU StudyHub — fixed platform-fee pricing, automatic payouts, history, request cooldown, soft-removal.

create table if not exists public.platform_pricing_settings (
  id boolean primary key default true check (id = true),
  default_fee_cents integer not null default 100 check (default_fee_cents >= 0 and default_fee_cents <= 100000),
  updated_at timestamptz not null default now()
);
insert into public.platform_pricing_settings(id, default_fee_cents)
values (true, 100)
on conflict (id) do nothing;

create table if not exists public.resource_platform_fee_settings (
  file_id uuid primary key references public.files(id) on delete cascade,
  fee_cents integer not null check (fee_cents >= 0 and fee_cents <= 100000),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_activity_history (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text not null default 'student' check (actor_role in ('student','seller','admin','super_admin')),
  action text not null,
  entity_type text,
  entity_id uuid,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_user_activity_history_actor_created on public.user_activity_history(actor_id, created_at desc);
create index if not exists idx_user_activity_history_role_created on public.user_activity_history(actor_role, created_at desc);
create index if not exists idx_user_activity_history_entity on public.user_activity_history(entity_type, entity_id, created_at desc);

create table if not exists public.recent_searches (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  query text not null,
  searched_at timestamptz not null default now(),
  primary key(profile_id, query)
);
create index if not exists idx_recent_searches_profile_time on public.recent_searches(profile_id, searched_at desc);

alter table public.payouts add column if not exists related_purchase_id uuid references public.purchases(id) on delete set null;
create unique index if not exists idx_payouts_related_purchase on public.payouts(related_purchase_id) where related_purchase_id is not null;

alter table public.platform_pricing_settings enable row level security;
drop policy if exists "platform pricing public read" on public.platform_pricing_settings;
create policy "platform pricing public read" on public.platform_pricing_settings for select using (true);
drop policy if exists "platform pricing admin write" on public.platform_pricing_settings;
create policy "platform pricing admin write" on public.platform_pricing_settings for all using (is_admin()) with check (is_admin());

alter table public.resource_platform_fee_settings enable row level security;
drop policy if exists "resource platform fee public read" on public.resource_platform_fee_settings;
create policy "resource platform fee public read" on public.resource_platform_fee_settings for select using (true);
drop policy if exists "resource platform fee admin write" on public.resource_platform_fee_settings;
create policy "resource platform fee admin write" on public.resource_platform_fee_settings for all using (is_admin()) with check (is_admin());

alter table public.user_activity_history enable row level security;
drop policy if exists "user history own read" on public.user_activity_history;
create policy "user history own read" on public.user_activity_history for select using (actor_id = auth.uid() or is_admin());
drop policy if exists "user history no client insert" on public.user_activity_history;
create policy "user history no client insert" on public.user_activity_history for insert with check (false);

alter table public.recent_searches enable row level security;
drop policy if exists "recent searches own access" on public.recent_searches;
create policy "recent searches own access" on public.recent_searches for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create or replace function public.record_user_activity(
  p_actor_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_description text,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare r text;
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id and not is_admin() then raise exception 'Not authorized to record activity for another user.'; end if;
  select case when role in ('admin','super_admin') then role::text when is_seller then 'seller' else 'student' end into r from profiles where id = p_actor_id;
  insert into user_activity_history(actor_id, actor_role, action, entity_type, entity_id, description, metadata)
  values (p_actor_id, coalesce(r,'student'), p_action, p_entity_type, p_entity_id, p_description, coalesce(p_metadata,'{}'::jsonb));
end;
$$;

create or replace function public.record_activity_for_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare actor uuid; action_name text; description text; entity text; target uuid; status_text text;
begin
  if tg_table_name = 'files' then
    actor := coalesce(new.seller_id, old.seller_id); entity := 'resource'; target := coalesce(new.id, old.id);
    action_name := 'resource.' || coalesce(new.visibility::text, old.visibility::text);
    description := coalesce(new.title, old.title, 'Resource updated');
    status_text := coalesce(new.visibility::text, old.visibility::text);
  elsif tg_table_name = 'purchases' then
    actor := coalesce(new.buyer_id, old.buyer_id); entity := 'purchase'; target := coalesce(new.id, old.id);
    action_name := 'purchase.' || coalesce(new.status::text, old.status::text);
    description := 'Purchase status changed';
    status_text := coalesce(new.status::text, old.status::text);
  elsif tg_table_name = 'payouts' then
    actor := coalesce(new.seller_id, old.seller_id); entity := 'payout'; target := coalesce(new.id, old.id);
    action_name := 'payout.' || coalesce(new.status::text, old.status::text);
    description := 'Automatic payout status changed';
    status_text := coalesce(new.status::text, old.status::text);
  elsif tg_table_name = 'resource_requests' then
    actor := coalesce(new.user_id, old.user_id); entity := 'resource_request'; target := coalesce(new.id, old.id);
    action_name := 'resource_request.' || coalesce(new.status::text, old.status::text);
    description := coalesce(new.title, 'Resource request updated');
    status_text := coalesce(new.status::text, old.status::text);
  else
    return coalesce(new, old);
  end if;
  perform record_user_activity(actor, action_name, entity, target, description, jsonb_build_object('status', status_text));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_user_activity_files on public.files;
create trigger trg_user_activity_files after insert or update of visibility on public.files for each row execute function public.record_activity_for_row();
drop trigger if exists trg_user_activity_purchases on public.purchases;
create trigger trg_user_activity_purchases after insert or update of status on public.purchases for each row execute function public.record_activity_for_row();
drop trigger if exists trg_user_activity_payouts on public.payouts;
create trigger trg_user_activity_payouts after insert or update of status on public.payouts for each row execute function public.record_activity_for_row();
drop trigger if exists trg_user_activity_resource_requests on public.resource_requests;
create trigger trg_user_activity_resource_requests after insert or update of status on public.resource_requests for each row execute function public.record_activity_for_row();

create or replace function public.record_activity_for_misc_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare actor uuid; action_name text; description text; entity text; target uuid; status_text text;
begin
  if tg_table_name = 'wishlists' then
    actor := coalesce(new.profile_id, old.profile_id); entity := 'resource'; target := coalesce(new.file_id, old.file_id); action_name := case when tg_op='DELETE' then 'resource.unsaved' else 'resource.saved' end; description := case when tg_op='DELETE' then 'Removed resource from saved items' else 'Saved resource' end; status_text := null;
  elsif tg_table_name = 'reports' then
    actor := coalesce(new.reporter_id, old.reporter_id); entity := 'report'; target := coalesce(new.id, old.id); action_name := 'report.' || coalesce(new.status::text, old.status::text, tg_op); description := 'Resource report activity'; status_text := coalesce(new.status::text, old.status::text);
  elsif tg_table_name = 'support_tickets' then
    actor := coalesce(new.user_id, old.user_id); entity := 'support'; target := coalesce(new.id, old.id); action_name := 'support.' || coalesce(new.status::text, old.status::text, tg_op); description := coalesce(new.subject, old.subject, 'Support ticket activity'); status_text := coalesce(new.status::text, old.status::text);
  else
    return coalesce(new, old);
  end if;
  perform record_user_activity(actor, action_name, entity, target, description, jsonb_build_object('status', status_text, 'operation', tg_op));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_user_activity_wishlists on public.wishlists;
create trigger trg_user_activity_wishlists after insert or delete on public.wishlists for each row execute function public.record_activity_for_misc_row();
drop trigger if exists trg_user_activity_reports on public.reports;
create trigger trg_user_activity_reports after insert or update of status on public.reports for each row execute function public.record_activity_for_misc_row();
drop trigger if exists trg_user_activity_support on public.support_tickets;
create trigger trg_user_activity_support after insert or update of status on public.support_tickets for each row execute function public.record_activity_for_misc_row();

create or replace function public.enforce_resource_request_cooldown() returns trigger
language plpgsql security definer set search_path = public as $$
declare last_at timestamptz;
begin
  select max(created_at) into last_at from public.resource_requests where user_id = new.user_id;
  if last_at is not null and last_at > now() - interval '3 days' then
    raise exception 'You can submit only one resource request every 3 days. Your next request becomes available on %.', to_char(last_at + interval '3 days', 'YYYY-MM-DD HH24:MI');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_resource_request_cooldown on public.resource_requests;
create trigger trg_resource_request_cooldown before insert on public.resource_requests for each row execute function public.enforce_resource_request_cooldown();

create or replace function public.get_resource_buyer_price(p_file_id uuid) returns integer
language plpgsql stable security definer set search_path = public as $$
declare base_price integer; fee integer;
begin
  select price_cents into base_price from files where id = p_file_id;
  if base_price is null then return null; end if;
  select coalesce(r.fee_cents, p.default_fee_cents) into fee from platform_pricing_settings p left join resource_platform_fee_settings r on r.file_id = p_file_id where p.id = true;
  return base_price + coalesce(fee,0);
end;
$$;

drop function if exists public.approve_manual_bkash_purchase(uuid);
create or replace function public.approve_manual_bkash_purchase(p_purchase_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare p purchases%rowtype; f files%rowtype; fee integer; expected_total integer; seller_earning integer; platform_earning integer; payout_id uuid;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  select * into p from purchases where id = p_purchase_id for update;
  if p.id is null then raise exception 'Purchase not found'; end if;
  if p.status <> 'pending' then raise exception 'Purchase is not pending'; end if;
  if p.payment_method <> 'bkash' then raise exception 'Unsupported payment method'; end if;
  select * into f from files where id = p.file_id for update;
  if f.id is null then raise exception 'Resource not found'; end if;
  select coalesce(r.fee_cents, s.default_fee_cents, 0) into fee from platform_pricing_settings s left join resource_platform_fee_settings r on r.file_id = f.id where s.id = true;
  -- Preserve the exact price/fee snapshot captured when the buyer submitted the payment.
  -- This prevents an admin fee change after checkout from invalidating a pending purchase.
  if coalesce(p.seller_earning_cents, 0) > 0 or coalesce(p.commission_cents, 0) > 0 then
    seller_earning := coalesce(p.seller_earning_cents, greatest(0, p.amount_cents - p.commission_cents));
    platform_earning := coalesce(p.commission_cents, greatest(0, p.amount_cents - seller_earning));
  else
    seller_earning := f.price_cents;
    platform_earning := greatest(0, p.amount_cents - seller_earning);
  end if;
  if p.amount_cents <> seller_earning + platform_earning then raise exception 'Purchase amount is inconsistent with the stored price snapshot.'; end if;
  update purchases set status='completed', commission_cents=platform_earning, seller_earning_cents=seller_earning, approved_at=now(), approved_by=auth.uid(), rejection_reason=null where id=p_purchase_id;
  insert into wallet_transactions(profile_id,type,amount_cents,related_purchase_id,description) values(f.seller_id,'purchase',seller_earning,p_purchase_id,'Seller price earned from approved purchase');
  if seller_earning > 0 then
    select id into payout_id from payouts where related_purchase_id = p_purchase_id limit 1;
    if payout_id is null then
      insert into payouts(seller_id,amount_cents,status,payment_method,payment_account_number,related_purchase_id) select f.seller_id,seller_earning,'pending','bkash',s.bkash_number,p_purchase_id from seller_payment_settings s where s.seller_id=f.seller_id returning id into payout_id;
      if payout_id is null then
        insert into payouts(seller_id,amount_cents,status,payment_method,related_purchase_id) values(f.seller_id,seller_earning,'pending','bkash',p_purchase_id) returning id into payout_id;
      end if;
    end if;
  end if;

  -- Keep the profile wallet in sync with authoritative seller earnings and payout states.
  update profiles set wallet_balance_cents = greatest(0,
    coalesce((select sum(coalesce(pc.seller_earning_cents,0))
              from purchases pc join files fc on fc.id=pc.file_id
              where fc.seller_id=f.seller_id and pc.status='completed'),0)
    - coalesce((select sum(amount_cents) from payouts po
                where po.seller_id=f.seller_id and po.status in ('completed','pending','processing')),0)
  ), updated_at=now() where id=f.seller_id;

  insert into notifications(profile_id,type,title,body,link) values
    (p.buyer_id,'purchase_completed','Payment approved — resource unlocked',coalesce(f.title,'Your resource') || ' is now available. You can view or download it.','/files/'||f.id::text),
    (f.seller_id,'purchase_completed','You made a sale',coalesce(f.title,'Your resource') || ' was purchased. Your earning is '||to_char(seller_earning/100.0,'FM999999990.00')||' BDT. An automatic payout is now waiting for admin payment.','/dashboard/sales');
end;
$$;

create or replace function public.set_default_platform_fee(p_fee_cents integer) returns void
language plpgsql security definer set search_path = public as $$
begin if not is_admin() then raise exception 'Not authorized'; end if; if p_fee_cents < 0 or p_fee_cents > 100000 then raise exception 'Platform fee must be between 0 and 1000 BDT.'; end if; update platform_pricing_settings set default_fee_cents=p_fee_cents,updated_at=now() where id=true; end; $$;

create or replace function public.set_resource_platform_fee(p_file_id uuid,p_fee_cents integer) returns void
language plpgsql security definer set search_path = public as $$
begin if not is_admin() then raise exception 'Not authorized'; end if; if p_fee_cents is null or p_fee_cents < 0 or p_fee_cents > 100000 then raise exception 'Platform fee must be between 0 and 1000 BDT.'; end if; insert into resource_platform_fee_settings(file_id,fee_cents,updated_at) values(p_file_id,p_fee_cents,now()) on conflict(file_id) do update set fee_cents=excluded.fee_cents,updated_at=now(); end; $$;

-- Seller payout requests are disabled; payouts are created automatically from approved sales.
revoke execute on function public.request_seller_payout(integer) from public, authenticated;

create or replace function public.reconcile_seller_financials() returns integer
language plpgsql security definer set search_path = public as $$
declare row_count integer := 0; r record; new_balance bigint;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;

  -- Repair missing per-purchase wallet ledger entries without creating duplicate payouts.
  -- Historical payout rows may pre-date the related_purchase_id column, so inferring a new
  -- payout from an old completed purchase could pay the seller twice. New payouts are already
  -- created automatically by approve_manual_bkash_purchase().
  for r in select p.id,p.seller_earning_cents,f.seller_id
            from purchases p
            join files f on f.id=p.file_id
            where p.status='completed' and coalesce(p.seller_earning_cents,0) > 0 loop
    if not exists(select 1 from wallet_transactions w where w.related_purchase_id=r.id and w.type='purchase') then
      insert into wallet_transactions(profile_id,type,amount_cents,related_purchase_id,description)
      values(r.seller_id,'purchase',r.seller_earning_cents,r.id,'Reconciled seller earning from approved purchase');
      row_count := row_count + 1;
    end if;
  end loop;

  -- Rebuild each seller's available wallet balance from the authoritative financial records.
  -- Completed and pending payouts are both excluded from the currently available balance.
  for r in select id from profiles where is_seller = true loop
    select greatest(0,
      coalesce((select sum(coalesce(p.seller_earning_cents,0))
                from purchases p
                join files f on f.id=p.file_id
                where f.seller_id=r.id and p.status='completed'),0)
      - coalesce((select sum(amount_cents) from payouts po
                  where po.seller_id=r.id and po.status in ('completed','pending','processing')),0)
    ) into new_balance;
    update profiles set wallet_balance_cents=new_balance, updated_at=now() where id=r.id;
  end loop;

  return row_count;
end;
$$;

-- Soft-removal: preserve admin/resource/purchase history and do not delete storage.
-- Existing visibility='archived' is used for removed resources.

-- Read-only platform fee helper is public so buyer cards can display the exact amount.


create or replace function public.record_admin_audit_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.actor_id is not null then
    perform record_user_activity(new.actor_id, new.action, coalesce(new.target_table, 'audit'), new.target_id, 'Admin audit action: ' || new.action, coalesce(new.metadata, '{}'::jsonb));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_activity_audit_logs on public.audit_logs;
create trigger trg_user_activity_audit_logs after insert on public.audit_logs for each row execute function public.record_admin_audit_history();

revoke execute on function public.record_user_activity(uuid,text,text,uuid,text,jsonb) from anon;


-- Automatic payouts may be any positive amount; there is no manual minimum request gate.
create or replace function public.complete_seller_payout(p_payout_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare p payouts%rowtype; seller_earnings bigint; completed_paid bigint; pending_paid bigint; available_balance bigint; remaining_balance bigint;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  select * into p from payouts where id=p_payout_id for update;
  if p.id is null then raise exception 'Payout not found'; end if;
  if p.status <> 'pending' then raise exception 'Payout is not pending'; end if;
  if p.amount_cents <= 0 then raise exception 'Payout amount must be positive'; end if;

  -- Do not trust a potentially stale profile wallet value. Calculate availability from sales
  -- and payout records so historical reconciliation cannot overpay a seller.
  select coalesce(sum(coalesce(pc.seller_earning_cents,0)),0) into seller_earnings
  from purchases pc join files fc on fc.id=pc.file_id
  where fc.seller_id=p.seller_id and pc.status='completed';

  select coalesce(sum(amount_cents),0) into completed_paid
  from payouts where seller_id=p.seller_id and status='completed';

  select coalesce(sum(amount_cents),0) into pending_paid
  from payouts where seller_id=p.seller_id and status in ('pending','processing');

  available_balance := greatest(0, seller_earnings - completed_paid - pending_paid);
  if p.amount_cents > available_balance then raise exception 'Seller balance is insufficient'; end if;

  update payouts set status='completed', processed_at=now() where id=p_payout_id;
  insert into wallet_transactions(profile_id,type,amount_cents,related_purchase_id,description)
  values(p.seller_id,'payout',-p.amount_cents,p.related_purchase_id,'Automatic bKash payout completed');

  remaining_balance := greatest(0, seller_earnings - (completed_paid + p.amount_cents) - pending_paid + p.amount_cents);
  update profiles set wallet_balance_cents=remaining_balance,updated_at=now() where id=p.seller_id;
  insert into notifications(profile_id,type,title,body,link) values(p.seller_id,'payout_completed','Payout completed', 'Your '||to_char(p.amount_cents/100.0,'FM999999990.00')||' BDT automatic payout was marked as paid by StudyHub admin.','/dashboard/payment-settings');
end;
$$;
