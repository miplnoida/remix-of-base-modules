-- Idempotent guard: realtime publication for ia_risk_categories
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ia_risk_categories' AND relnamespace = 'public'::regnamespace)
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'ia_risk_categories'
     ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.ia_risk_categories';
  END IF;
END $$;

-- Idempotent re-assert of bn_medical_* updated_at triggers (safe whether or not tables exist)
DO $$
DECLARE t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $f$ BEGIN NEW.updated_at = now(); RETURN NEW; END $f$
    LANGUAGE plpgsql SET search_path = public;
  END IF;

  FOREACH t IN ARRAY ARRAY[
    'bn_medical_procedure','bn_medical_facility','bn_medical_facility_procedure',
    'bn_medical_referral_rule','bn_medical_expense_type','bn_medical_reimbursement_limit',
    'bn_medical_claim_expense','bn_medical_recommendation'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = t AND relnamespace = 'public'::regnamespace) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', t, t);
      EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
    END IF;
  END LOOP;
END $$;