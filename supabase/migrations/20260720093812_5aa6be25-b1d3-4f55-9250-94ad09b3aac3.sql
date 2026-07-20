
CREATE TABLE IF NOT EXISTS public.bn_mortality_integration_readiness (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_code TEXT NOT NULL UNIQUE,
  owning_module TEXT NOT NULL,
  certification_status TEXT NOT NULL DEFAULT 'NOT_CERTIFIED',
  is_ready BOOLEAN NOT NULL DEFAULT false,
  certified_at TIMESTAMPTZ,
  certification_reference TEXT,
  notes TEXT,
  row_version INTEGER NOT NULL DEFAULT 1,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bn_mortality_integration_readiness_status_chk
    CHECK (certification_status IN ('NOT_CERTIFIED','IN_PROGRESS','CERTIFIED','REVOKED'))
);

GRANT SELECT ON public.bn_mortality_integration_readiness TO authenticated;
GRANT ALL ON public.bn_mortality_integration_readiness TO service_role;

ALTER TABLE public.bn_mortality_integration_readiness ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_readonly" ON public.bn_mortality_integration_readiness;
CREATE POLICY "authenticated_readonly"
  ON public.bn_mortality_integration_readiness
  FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.bn_mortality_integration_readiness_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  NEW.row_version := COALESCE(OLD.row_version, 0) + 1;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_bn_mortality_integration_readiness_touch
  ON public.bn_mortality_integration_readiness;
CREATE TRIGGER trg_bn_mortality_integration_readiness_touch
  BEFORE UPDATE ON public.bn_mortality_integration_readiness
  FOR EACH ROW EXECUTE FUNCTION public.bn_mortality_integration_readiness_touch();

INSERT INTO public.bn_mortality_integration_readiness
  (integration_code, owning_module, certification_status, is_ready, notes)
VALUES
  ('awards',        'bn_awards',        'NOT_CERTIFIED', false, 'BN-MORT-2B.2A Award DB acceptance pending.'),
  ('dms',           'core_dms',         'NOT_CERTIFIED', false, 'BN-MORT-2B.1 §7 DMS/core_generated_document link boundary pending.'),
  ('overpayments',  'bn_overpayments',  'NOT_CERTIFIED', false, 'BN-MORT-2B.1 §6 Overpayment boundary pending.'),
  ('survivor',      'bn_claims',        'NOT_CERTIFIED', false, 'BN-MORT-2B.1 §8 Survivor intake pending.'),
  ('funeral',       'bn_claims',        'NOT_CERTIFIED', false, 'BN-MORT-2B.1 §8 Funeral grant intake pending.'),
  ('legal',         'lg_case_intake',   'NOT_CERTIFIED', false, 'BN-MORT-2B.1 §8 Legal referral pending.')
ON CONFLICT (integration_code) DO NOTHING;
