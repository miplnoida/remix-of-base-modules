-- ============================================================================
-- Dashboard: make Employer Compliance Status fully DB-driven with consistent
-- denominator anchored on the full er_master (status='A') dataset.
-- Categories: Compliant | Minor Issues | Under Review | Non-Compliant
-- Source of truth precedence (per employer):
--   1) ce_employer_compliance_status.overall_compliance_status (latest)
--   2) Else derived from ce_violations open severity
--   3) Else 'Compliant' (no signal = compliant)
-- ============================================================================

CREATE OR REPLACE VIEW public.dashboard_v_employer_compliance_status AS
WITH active_employers AS (
  SELECT regno::text AS employer_id
  FROM public.er_master
  WHERE status = 'A'
),
latest_status AS (
  SELECT DISTINCT ON (employer_id)
    employer_id,
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
      CASE lower(ls.overall_compliance_status)
        WHEN 'compliant'     THEN 'Compliant'
        WHEN 'minor_issues'  THEN 'Minor Issues'
        WHEN 'minor'         THEN 'Minor Issues'
        WHEN 'under_review'  THEN 'Under Review'
        WHEN 'review'        THEN 'Under Review'
        WHEN 'non_compliant' THEN 'Non-Compliant'
        WHEN 'noncompliant'  THEN 'Non-Compliant'
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

-- Distribution: categories sum exactly to total active employers (denominator)
CREATE OR REPLACE VIEW public.dashboard_v_compliance_distribution AS
WITH base AS (SELECT bucket FROM public.dashboard_v_employer_compliance_status),
buckets(name, color, sort_order) AS (
  VALUES
    ('Compliant',     'hsl(144 65% 34%)', 1),
    ('Minor Issues',  'hsl(44 90% 57%)',  2),
    ('Under Review',  'hsl(217 91% 60%)', 3),
    ('Non-Compliant', 'hsl(2 74% 50%)',   4)
)
SELECT b.name, COALESCE(c.cnt, 0)::integer AS value, b.color
FROM buckets b
LEFT JOIN (SELECT bucket, COUNT(*)::integer AS cnt FROM base GROUP BY bucket) c
  ON c.bucket = b.name
ORDER BY b.sort_order;

-- Metrics: same denominator, compliant_employers from same source of truth
CREATE OR REPLACE VIEW public.dashboard_v_compliance_metrics AS
SELECT
  (SELECT COUNT(*)::integer FROM public.er_master WHERE status='A') AS total_employers,
  (SELECT COUNT(*)::integer FROM public.dashboard_v_employer_compliance_status WHERE bucket='Compliant') AS compliant_employers,
  (SELECT COUNT(*)::integer FROM public.ce_violations
     WHERE status NOT IN ('RESOLVED','CLOSED','DISMISSED')
       AND (is_deleted=false OR is_deleted IS NULL)) AS active_violations,
  (SELECT COUNT(*)::integer FROM public.ce_inspections
     WHERE status IN ('SCHEDULED','PENDING')) AS pending_audits;