CREATE OR REPLACE VIEW public.dashboard_v_employer_compliance_status AS
WITH active_employers AS (
  SELECT regno::text AS employer_id
  FROM public.er_master
  WHERE status = 'A'
),
latest_status AS (
  SELECT DISTINCT ON (employer_id)
    employer_id,
    compliance_status,
    overall_compliance_status,
    last_computed_at
  FROM public.ce_employer_compliance_status
  WHERE overall_compliance_status IS NOT NULL
  ORDER BY employer_id, last_computed_at DESC NULLS LAST, updated_at DESC NULLS LAST
),
open_violations AS (
  SELECT
    employer_id,
    MAX(CASE severity
      WHEN 'CRITICAL' THEN 4
      WHEN 'HIGH'     THEN 3
      WHEN 'MEDIUM'   THEN 2
      WHEN 'LOW'      THEN 1
      ELSE 0
    END) AS max_sev
  FROM public.ce_violations
  WHERE employer_id IS NOT NULL
    AND status NOT IN ('RESOLVED','CLOSED','DISMISSED')
    AND (is_deleted = false OR is_deleted IS NULL)
  GROUP BY employer_id
)
SELECT
  ae.employer_id,
  CASE
    WHEN ls.overall_compliance_status IS NOT NULL THEN
      CASE
        WHEN ls.overall_compliance_status IN ('non_compliant','critical') THEN 'Non-Compliant'
        WHEN ls.overall_compliance_status = 'partially_compliant' AND ls.compliance_status = 'under_review' THEN 'Under Review'
        WHEN ls.overall_compliance_status = 'partially_compliant' THEN 'Minor Issues'
        WHEN ls.overall_compliance_status = 'compliant' THEN 'Compliant'
        ELSE 'Under Review'
      END
    WHEN ov.max_sev IS NULL THEN 'Compliant'
    WHEN ov.max_sev >= 3    THEN 'Non-Compliant'
    WHEN ov.max_sev = 2     THEN 'Under Review'
    WHEN ov.max_sev = 1     THEN 'Minor Issues'
    ELSE 'Compliant'
  END AS bucket
FROM active_employers ae
LEFT JOIN latest_status   ls ON ls.employer_id = ae.employer_id
LEFT JOIN open_violations ov ON ov.employer_id = ae.employer_id;