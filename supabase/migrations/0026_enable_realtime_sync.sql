-- Enable Supabase Realtime for live UI synchronization.
-- Safe to re-run: only tables not already in supabase_realtime are added.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'files',
    'courses',
    'departments',
    'profiles',
    'notifications',
    'purchases',
    'payouts',
    'resource_requests',
    'announcements',
    'academic_documents',
    'deadlines'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = table_name
    )
    AND NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = table_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    END IF;
  END LOOP;
END $$;

-- Keep enough row identity for filtered update/delete events.
DO $$
BEGIN
  ALTER TABLE public.notifications REPLICA IDENTITY FULL;
  ALTER TABLE public.purchases REPLICA IDENTITY FULL;
  ALTER TABLE public.resource_requests REPLICA IDENTITY FULL;
  ALTER TABLE public.profiles REPLICA IDENTITY FULL;
  ALTER TABLE public.payouts REPLICA IDENTITY FULL;
  ALTER TABLE public.files REPLICA IDENTITY FULL;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;
