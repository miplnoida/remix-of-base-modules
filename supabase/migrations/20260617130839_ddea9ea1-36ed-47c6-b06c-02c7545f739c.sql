
UPDATE public.bn_medical_reimbursement_limit
   SET location_code = 'LOCAL_ST_KITTS'
 WHERE location_code = 'LOCAL_SK';

ALTER TABLE public.bn_medical_reimbursement_limit
  ADD COLUMN IF NOT EXISTS legal_reference TEXT;

ALTER TABLE public.bn_medical_reimbursement_limit
  DROP CONSTRAINT IF EXISTS bn_medical_reimbursement_limit_location_chk;

ALTER TABLE public.bn_medical_reimbursement_limit
  ADD CONSTRAINT bn_medical_reimbursement_limit_location_chk
  CHECK (
    location_code IS NULL
    OR location_code IN ('LOCAL_ST_KITTS','NEVIS','CARIBBEAN','INTERNATIONAL','ANY')
  );

COMMENT ON COLUMN public.bn_medical_reimbursement_limit.legal_reference
  IS 'Statutory / regulatory citation backing this rule (e.g. SI 2019/12).';

COMMENT ON TABLE public.bn_medical_tariff_table
  IS 'DEPRECATED 2026-06 — superseded by bn_medical_reimbursement_limit. Runtime no longer reads from this table.';
COMMENT ON TABLE public.bn_medical_tariff_row
  IS 'DEPRECATED 2026-06 — rows mirrored into bn_medical_reimbursement_limit via source_tariff_row_id. Do not read at runtime.';

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.bn_medical_tariff_table FROM authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.bn_medical_tariff_row   FROM authenticated;
