-- EWU StudyHub: sensitive request notification types used by the user-facing
-- My Requests + Notifications surfaces.
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'upload_approved'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'upload_rejected'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'purchase_pending'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'seller_approved'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'seller_rejected'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Request state is intentionally derived from the source-of-truth tables:
-- profiles (seller verification), files (resource approval), purchases (purchase
-- requests) and payouts (payout requests). Notifications provide the human
-- confirmation/decision messages without creating a second status system.
