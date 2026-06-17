
-- Normalize formula governance statuses to canonical 4: DRAFT, IN_REVIEW, ACTIVE, RETIRED.

-- Drop old check constraints
ALTER TABLE public.bn_formula_template DROP CONSTRAINT IF EXISTS bn_formula_template_governance_status_chk;
ALTER TABLE public.bn_formula_version  DROP CONSTRAINT IF EXISTS bn_formula_version_governance_status_check;

-- Normalize version statuses
UPDATE public.bn_formula_version
SET governance_status = CASE
  WHEN UPPER(governance_status) IN ('ACTIVE','READY_FOR_PRODUCT_USE','APPROVED','LEGAL_CONFIRMED') THEN 'ACTIVE'
  WHEN UPPER(governance_status) IN ('DRAFT')                                                       THEN 'DRAFT'
  WHEN UPPER(governance_status) IN ('IN_REVIEW','REVIEW','TECHNICAL_REVIEW','LEGAL_REVIEW')        THEN 'IN_REVIEW'
  WHEN UPPER(governance_status) IN ('RETIRED','DEPRECATED','ARCHIVED')                             THEN 'RETIRED'
  ELSE 'DRAFT'
END;

-- Backfill template.governance_status from latest version where present,
-- else fall back to is_active+legacy mapping per spec:
--   has ACTIVE version            -> ACTIVE
--   has any non-DRAFT version     -> that latest version status
--   otherwise                     -> DRAFT
UPDATE public.bn_formula_template t
SET governance_status = COALESCE(sub.derived_status, 'DRAFT')
FROM (
  SELECT
    t2.id AS template_id,
    CASE
      WHEN bool_or(v.governance_status = 'ACTIVE')    THEN 'ACTIVE'
      WHEN bool_or(v.governance_status = 'IN_REVIEW') THEN 'IN_REVIEW'
      WHEN bool_or(v.governance_status = 'RETIRED')   THEN 'RETIRED'
      WHEN COUNT(v.id) > 0                            THEN 'DRAFT'
      ELSE 'DRAFT'
    END AS derived_status
  FROM public.bn_formula_template t2
  LEFT JOIN public.bn_formula_version v ON v.formula_template_id = t2.id
  GROUP BY t2.id
) sub
WHERE sub.template_id = t.id;

-- Reapply tightened constraints
ALTER TABLE public.bn_formula_template
  ADD CONSTRAINT bn_formula_template_governance_status_chk
  CHECK (governance_status IN ('DRAFT','IN_REVIEW','ACTIVE','RETIRED'));

ALTER TABLE public.bn_formula_version
  ADD CONSTRAINT bn_formula_version_governance_status_check
  CHECK (governance_status IN ('DRAFT','IN_REVIEW','ACTIVE','RETIRED'));
