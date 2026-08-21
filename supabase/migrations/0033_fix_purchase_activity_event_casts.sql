-- Fix purchase activity trigger calls where purchase_status is passed to a text parameter.
-- This keeps the existing activity timeline behavior while making the function signature
-- unambiguous for PostgreSQL.

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
    new.approved_by,
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
      new.approved_by,
      jsonb_build_object(
        'invoice_number', new.invoice_number,
        'amount_cents', new.amount_cents
      )
    );
  end if;

  return new;
end;
$$;
