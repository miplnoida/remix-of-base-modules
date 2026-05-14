DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_views
    WHERE schemaname = 'public'
      AND viewname = 'dashboard_v_employer_compliance_status'
  ) THEN
    EXECUTE $view$
      CREATE VIEW public.dashboard_v_employer_compliance_status AS
      SELECT
        regno::text AS employer_id,
        'Compliant'::text AS bucket
      FROM public.er_master
      WHERE status = 'A'
    $view$;
  END IF;
END $$;
