-- EWU StudyHub: reconcile notification_type enum values used by the current app.
-- Safe to run repeatedly; existing values are left untouched.
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'seller_approved'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'seller_rejected'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'purchase_pending'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'purchase_approved'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'purchase_rejected'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'payout_requested'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'payout_pending'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'payment_submitted'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'upload_pending'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'seller_verification_pending'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'admin_message'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'announcement'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'deadline'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'resource_request_update'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
