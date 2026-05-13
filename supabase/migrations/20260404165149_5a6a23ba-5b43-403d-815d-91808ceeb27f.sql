DO $$
BEGIN
  -- If the old 'designations' table exists and 'tb_designations' does not, rename it
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'designations')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tb_designations') THEN
    ALTER TABLE public.designations RENAME TO tb_designations;
  END IF;
END $$;