-- Fix all activity-event trigger calls where PostgreSQL enum values are passed
-- to record_activity_event(text, ...) parameters. Explicit casts prevent
-- approval/rejection flows from failing with function-signature resolution errors.

create or replace function public.activity_event_payout() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.record_activity_event(
    new.seller_id,
    'payout'::text,
    new.id,
    new.status::text,
    (case new.status
      when 'pending' then 'Payout request submitted'
      when 'processing' then 'Payout is processing'
      when 'completed' then 'Payout completed'
      when 'failed' then 'Payout rejected'
      else 'Payout updated'
    end)::text,
    concat('Amount: ', round(new.amount_cents/100.0,2), ' BDT')::text,
    null::uuid,
    jsonb_build_object('amount_cents', new.amount_cents)
  );
  return new;
end;
$$;

drop trigger if exists trg_activity_payout on public.payouts;
create trigger trg_activity_payout
after insert or update of status on public.payouts
for each row execute function public.activity_event_payout();

create or replace function public.activity_event_file() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.record_activity_event(
    new.seller_id,
    'resource'::text,
    new.id,
    new.visibility::text,
    (case new.visibility
      when 'draft' then 'Resource submitted for review'
      when 'published' then 'Resource approved and published'
      when 'rejected' then 'Resource rejected by admin'
      when 'archived' then 'Resource archived'
      else 'Resource updated'
    end)::text,
    new.title::text,
    null::uuid,
    jsonb_build_object('rejection_reason', new.rejection_reason)
  );
  return new;
end;
$$;

drop trigger if exists trg_activity_file on public.files;
create trigger trg_activity_file
after insert or update of visibility, rejection_reason on public.files
for each row execute function public.activity_event_file();

create or replace function public.activity_event_profile_verification() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.student_id_verification_status is distinct from old.student_id_verification_status
     and new.student_id_verification_status in ('pending','verified','rejected') then
    perform public.record_activity_event(
      new.id,
      'seller_verification'::text,
      new.id,
      new.student_id_verification_status::text,
      (case new.student_id_verification_status
        when 'pending' then 'Seller verification submitted'
        when 'verified' then 'Seller verification approved'
        when 'rejected' then 'Seller verification rejected'
        else 'Seller verification updated'
      end)::text,
      'Your seller verification status changed.'::text,
      null::uuid,
      '{}'::jsonb
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_activity_profile_verification on public.profiles;
create trigger trg_activity_profile_verification
after update of student_id_verification_status on public.profiles
for each row execute function public.activity_event_profile_verification();

create or replace function public.activity_event_resource_request() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.record_activity_event(
    new.user_id,
    'resource_request'::text,
    new.id,
    new.status::text,
    (case when tg_op = 'INSERT' then 'Resource request submitted' else 'Resource request updated' end)::text,
    new.title::text,
    null::uuid,
    '{}'::jsonb
  );
  return new;
end;
$$;

drop trigger if exists trg_activity_resource_request on public.resource_requests;
create trigger trg_activity_resource_request
after insert or update of status on public.resource_requests
for each row execute function public.activity_event_resource_request();

create or replace function public.activity_event_support_ticket() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.record_activity_event(
    new.user_id,
    'support'::text,
    new.id,
    new.status::text,
    (case
      when tg_op = 'INSERT' then 'Support request submitted'
      when new.status is distinct from old.status then 'Support request status updated'
      else 'Support request updated'
    end)::text,
    coalesce(new.subject, 'Support request')::text,
    null::uuid,
    jsonb_build_object('category', new.category)
  );
  return new;
end;
$$;

drop trigger if exists trg_activity_support_ticket on public.support_tickets;
create trigger trg_activity_support_ticket
after insert or update of status, admin_reply on public.support_tickets
for each row execute function public.activity_event_support_ticket();

-- Keep the purchase trigger fix in the same migration chain so all activity-event
-- triggers use the same explicit typing convention.
create or replace function public.activity_event_purchase() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  seller uuid;
  resource_title text;
  label text;
begin
  select f.seller_id, f.title
    into seller, resource_title
  from public.files f
  where f.id = new.file_id;

  label := case new.status
    when 'pending' then 'Purchase request submitted'
    when 'completed' then 'Purchase completed'
    when 'failed' then 'Purchase rejected'
    when 'refunded' then 'Purchase refunded'
    else 'Purchase updated'
  end;

  perform public.record_activity_event(
    new.buyer_id,
    'purchase'::text,
    new.id,
    new.status::text,
    label::text,
    coalesce(resource_title, 'Resource purchase')::text,
    new.approved_by::uuid,
    jsonb_build_object(
      'invoice_number', new.invoice_number,
      'amount_cents', new.amount_cents
    )
  );

  if seller is not null then
    perform public.record_activity_event(
      seller,
      'purchase'::text,
      new.id,
      new.status::text,
      label::text,
      coalesce(resource_title, 'Resource purchase')::text,
      new.approved_by::uuid,
      jsonb_build_object(
        'invoice_number', new.invoice_number,
        'amount_cents', new.amount_cents
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_activity_purchase on public.purchases;
create trigger trg_activity_purchase
after insert or update of status, approved_at, rejection_reason on public.purchases
for each row execute function public.activity_event_purchase();
