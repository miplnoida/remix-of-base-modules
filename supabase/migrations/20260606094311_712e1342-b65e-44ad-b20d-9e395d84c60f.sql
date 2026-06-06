
ALTER TABLE public.bn_product_version
  ADD COLUMN IF NOT EXISTS benefit_duration_type VARCHAR(20) NOT NULL DEFAULT 'SHORT_TERM',
  ADD COLUMN IF NOT EXISTS award_creation_rule VARCHAR(30) NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS payment_frequency VARCHAR(20),
  ADD COLUMN IF NOT EXISTS review_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS life_certificate_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS medical_review_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS survivor_beneficiary_policy JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.bn_product_version.benefit_duration_type IS 'SHORT_TERM | LONG_TERM | ONE_TIME_GRANT';
COMMENT ON COLUMN public.bn_product_version.award_creation_rule IS 'NONE | ON_APPROVAL | MANUAL';

UPDATE public.bn_product_version pv
SET benefit_duration_type = 'LONG_TERM',
    award_creation_rule = 'ON_APPROVAL',
    payment_frequency = COALESCE(payment_frequency, 'MONTHLY')
FROM public.bn_product p
WHERE pv.product_id = p.id
  AND (
    p.benefit_code ILIKE '%AGE%' OR
    p.benefit_code ILIKE '%INVAL%' OR
    p.benefit_code ILIKE '%SURV%' OR
    p.benefit_code ILIKE '%DISAB%' OR
    p.benefit_code ILIKE '%NCAP%' OR
    p.benefit_name ILIKE '%pension%' OR
    p.payment_type = 'PERIODIC'
  );
