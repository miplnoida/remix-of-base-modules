
-- Extend reimbursement limits with the dimensions needed for the medical tariff resolver,
-- and relax legacy NOT NULL constraints so the extended dimensions can drive lookups.
ALTER TABLE public.bn_medical_reimbursement_limit
  ADD COLUMN IF NOT EXISTS location_code            text,
  ADD COLUMN IF NOT EXISTS provider_type_code       text,
  ADD COLUMN IF NOT EXISTS beneficiary_type         text,
  ADD COLUMN IF NOT EXISTS reimbursement_method     text,
  ADD COLUMN IF NOT EXISTS fixed_amount             numeric,
  ADD COLUMN IF NOT EXISTS ceiling_amount           numeric,
  ADD COLUMN IF NOT EXISTS referral_required        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_allowed        boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS pre_authorization_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_level           text,
  ADD COLUMN IF NOT EXISTS procedure_code           text,
  ADD COLUMN IF NOT EXISTS source_tariff_row_id     uuid,
  ADD COLUMN IF NOT EXISTS seed_tag                 text;

ALTER TABLE public.bn_medical_reimbursement_limit ALTER COLUMN reimbursement_percent DROP NOT NULL;
ALTER TABLE public.bn_medical_reimbursement_limit ALTER COLUMN cap_amount             DROP NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bn_medical_reimbursement_limit_method_chk') THEN
    ALTER TABLE public.bn_medical_reimbursement_limit
      ADD CONSTRAINT bn_medical_reimbursement_limit_method_chk
      CHECK (reimbursement_method IS NULL OR reimbursement_method IN (
        'FIXED_AMOUNT','PERCENTAGE_UP_TO_CEILING','ACTUAL_UP_TO_CEILING','FULL_REIMBURSEMENT','NOT_COVERED'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_bn_med_reimb_limit_lookup
  ON public.bn_medical_reimbursement_limit
  (procedure_code, location_code, provider_type_code, beneficiary_type, is_active);

INSERT INTO public.bn_medical_reimbursement_limit (
  procedure_id, procedure_code, expense_type_id, country_code, jurisdiction_level, cap_type,
  location_code, provider_type_code, beneficiary_type, reimbursement_method,
  cap_amount, reimbursement_percent, fixed_amount, ceiling_amount, currency_code,
  referral_required, emergency_allowed, pre_authorization_required, approval_level,
  effective_from, effective_to, is_active, notes, source_tariff_row_id, seed_tag,
  created_by, modified_by
)
SELECT
  (SELECT id FROM public.bn_medical_procedure mp WHERE mp.procedure_code = tr.procedure_code LIMIT 1),
  tr.procedure_code,
  NULL,
  'KN',
  CASE tr.location_code
    WHEN 'LOCAL_ST_KITTS' THEN 'LOCAL'
    WHEN 'LOCAL_SK'       THEN 'LOCAL'
    WHEN 'NEVIS'          THEN 'LOCAL'
    WHEN 'CARIBBEAN'      THEN 'REGIONAL'
    WHEN 'INTERNATIONAL'  THEN 'INTERNATIONAL'
    ELSE 'ANY'
  END,
  'PER_PROCEDURE',
  tr.location_code,
  tr.provider_type_code,
  tr.beneficiary_type,
  tr.reimbursement_method,
  COALESCE(tr.ceiling_amount, tr.fixed_amount),
  tr.percentage_rate,
  tr.fixed_amount,
  tr.ceiling_amount,
  tr.currency_code,
  tr.referral_required,
  tr.emergency_allowed,
  tr.pre_authorization_required,
  tr.approval_level,
  tr.effective_from,
  tr.effective_to,
  true,
  COALESCE(tr.notes, '') || ' [migrated from bn_medical_tariff_row]',
  tr.id,
  'SEED-TARIFF-MIGRATION',
  COALESCE(tr.created_by, 'SYSTEM'),
  COALESCE(tr.updated_by, 'SYSTEM')
FROM public.bn_medical_tariff_row tr
WHERE NOT EXISTS (
  SELECT 1 FROM public.bn_medical_reimbursement_limit rl WHERE rl.source_tariff_row_id = tr.id
);

COMMENT ON TABLE public.bn_medical_tariff_table IS 'LEGACY: superseded by bn_medical_reimbursement_limit (extended). Read-only history.';
COMMENT ON TABLE public.bn_medical_tariff_row IS 'LEGACY: superseded by bn_medical_reimbursement_limit (extended). Read-only history. See source_tariff_row_id on the new table.';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_medical_reimbursement_limit TO authenticated;
GRANT ALL ON public.bn_medical_reimbursement_limit TO service_role;
