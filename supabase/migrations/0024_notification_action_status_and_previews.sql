-- EWU StudyHub: pending action notifications and preview behavior
-- Add notification enum values used by the application before creating triggers.
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'payout_pending'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'seller_verification_pending'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'upload_pending'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Action status is derived from current DB state.

-- Notify the seller when a payout enters the pending state. Admin notifications
-- already exist; this adds the matching seller-facing action status.
CREATE OR REPLACE FUNCTION public.notify_seller_of_pending_payout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (profile_id, type, title, body, link)
    VALUES (
      NEW.seller_id,
      'payout_pending',
      'Payout request — waiting for admin payment',
      'Your ' || to_char(NEW.amount_cents / 100.0, 'FM999999990.00') || ' BDT payout is pending. It will remain here until an admin pays it to your saved bKash number.',
      '/dashboard/payment-settings'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_seller_pending_payout ON payouts;
CREATE TRIGGER trg_notify_seller_pending_payout
AFTER INSERT ON payouts
FOR EACH ROW EXECUTE FUNCTION public.notify_seller_of_pending_payout();
