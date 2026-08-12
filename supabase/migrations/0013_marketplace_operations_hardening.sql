-- Marketplace operations hardening: notification types, payout rejection,
-- admin visibility, and seller payout-request alerts.

CREATE OR REPLACE FUNCTION reject_seller_payout(p_payout_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p payouts%rowtype;
  reason text := nullif(trim(p_reason), '');
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT * INTO p FROM payouts WHERE id = p_payout_id FOR UPDATE;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Payout not found'; END IF;
  IF p.status <> 'pending' THEN RAISE EXCEPTION 'Payout is not pending'; END IF;

  UPDATE payouts
  SET status = 'failed', processed_at = now()
  WHERE id = p_payout_id;

  INSERT INTO notifications (profile_id, type, title, body, link)
  VALUES (
    p.seller_id,
    'report_update',
    'Payout request rejected',
    COALESCE(reason, 'Your payout request could not be processed. Please contact support if you need help.'),
    '/dashboard/payment-settings'
  );
END;
$$;

REVOKE ALL ON FUNCTION reject_seller_payout(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reject_seller_payout(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION notify_admins_of_pending_payout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (profile_id, type, title, body, link)
    SELECT id,
           'report_update',
           'New seller payout request',
           'A seller requested a payout of ' || to_char(NEW.amount_cents / 100.0, 'FM999999990.00') || ' BDT.',
           '/admin/payouts'
    FROM profiles
    WHERE role IN ('admin', 'super_admin');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_pending_payout ON payouts;
CREATE TRIGGER trg_notify_admins_pending_payout
AFTER INSERT ON payouts
FOR EACH ROW EXECUTE FUNCTION notify_admins_of_pending_payout();

-- A seller must have a payout account before requesting money.
ALTER TABLE seller_payment_settings
  DROP CONSTRAINT IF EXISTS seller_payment_settings_bkash_number_check;
ALTER TABLE seller_payment_settings
  ADD CONSTRAINT seller_payment_settings_bkash_number_check
  CHECK (bkash_number IS NULL OR bkash_number ~ '^01[0-9]{9}$');

-- Helpful indexes for the operational dashboards.
CREATE INDEX IF NOT EXISTS idx_purchases_pending_bkash
  ON purchases (payment_submitted_at, created_at)
  WHERE status = 'pending' AND payment_method = 'bkash';

CREATE INDEX IF NOT EXISTS idx_payouts_pending_created
  ON payouts (created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_purchases_seller_completed
  ON purchases (created_at, file_id)
  WHERE status = 'completed';
