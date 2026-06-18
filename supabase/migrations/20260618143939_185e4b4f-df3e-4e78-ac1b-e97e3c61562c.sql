
ALTER TABLE public.bn_country_participant_type
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS retired_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retired_by TEXT,
  ADD COLUMN IF NOT EXISTS retired_reason TEXT;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'bn_cpt_lifecycle_chk'
  ) THEN
    ALTER TABLE public.bn_country_participant_type
      ADD CONSTRAINT bn_cpt_lifecycle_chk
      CHECK (lifecycle_status IN ('DRAFT','ACTIVE','RETIRED'));
  END IF;
END $$;

UPDATE public.bn_country_participant_type
SET lifecycle_status = 'RETIRED'
WHERE is_active = FALSE AND lifecycle_status = 'ACTIVE';

CREATE OR REPLACE VIEW public.v_bn_participant_type_usage AS
WITH product_use AS (
  SELECT
    p.country_code,
    role_code AS type_code,
    COUNT(DISTINCT pv.id) AS product_version_count,
    COUNT(DISTINCT pv.id) FILTER (WHERE pv.status = 'ACTIVE') AS active_product_count
  FROM public.bn_product_participant_config ppc
  JOIN public.bn_product_version pv ON pv.id = ppc.product_version_id
  JOIN public.bn_product p ON p.id = pv.product_id
  CROSS JOIN LATERAL (
    SELECT jsonb_array_elements_text(
      COALESCE(to_jsonb(ppc.required_roles), '[]'::jsonb)
      || COALESCE(to_jsonb(ppc.optional_roles), '[]'::jsonb)
      || COALESCE(to_jsonb(ppc.allowed_applicant_kinds), '[]'::jsonb)
    ) AS role_code
  ) roles
  GROUP BY p.country_code, role_code
),
claim_use AS (
  SELECT
    p.country_code,
    cp.participant_type AS type_code,
    COUNT(*) AS historical_claim_count
  FROM public.bn_claim_participant cp
  JOIN public.bn_claim c ON c.id = cp.claim_id
  JOIN public.bn_product p ON p.id = c.product_id
  WHERE cp.participant_type IS NOT NULL
  GROUP BY p.country_code, cp.participant_type
)
SELECT
  COALESCE(pu.country_code, cu.country_code) AS country_code,
  COALESCE(pu.type_code, cu.type_code) AS type_code,
  COALESCE(pu.product_version_count, 0) AS product_version_count,
  COALESCE(pu.active_product_count, 0) AS active_product_count,
  COALESCE(cu.historical_claim_count, 0) AS historical_claim_count
FROM product_use pu
FULL OUTER JOIN claim_use cu
  ON pu.country_code = cu.country_code AND pu.type_code = cu.type_code;

GRANT SELECT ON public.v_bn_participant_type_usage TO authenticated, anon, service_role;
