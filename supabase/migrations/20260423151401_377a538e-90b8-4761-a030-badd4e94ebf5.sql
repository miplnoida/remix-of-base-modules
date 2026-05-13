-- Neutralize the destructive migration that triggers 2BP01 on Live publish
-- by replacing its effect with a no-op, then realign the 3 compliance views
-- non-destructively using CREATE OR REPLACE VIEW (no DROP, no CASCADE).

-- Note: We cannot edit prior migration files retroactively against Live,
-- but we can ensure no further DROP runs by aligning views in place.

CREATE OR REPLACE VIEW public.dashboard_v_employer_compliance_status AS
WITH active_employers AS (
  SELECT er_master.regno::text AS employer_id
  FROM public.er_master
  WHERE er_master.status = 'A'::bpchar
), latest_status AS (
  SELECT DISTINCT ON (s.employer_id)
    s.employer_id,
    s.compliance_status,
    s.overall_compliance_status,
    s.last_computed_at
  FROM public.ce_employer_compliance_status s
  WHERE s.overall_compliance_status IS NOT NULL
  ORDER BY s.employer_id, s.last_computed_at DESC NULLS LAST, s.updated_at DESC NULLS LAST
), open_violations AS (
  SELECT v.employer_id,
    max(CASE v.severity
      WHEN 'CRITICAL' THEN 4
      WHEN 'HIGH' THEN 3
      WHEN 'MEDIUM' THEN 2
      WHEN 'LOW' THEN 1
      ELSE 0
    END) AS max_sev
  FROM public.ce_violations v
  WHERE v.employer_id IS NOT NULL
    AND (v.status::text <> ALL (ARRAY['RESOLVED','CLOSED','DISMISSED']::text[]))
    AND (v.is_deleted = false OR v.is_deleted IS NULL)
  GROUP BY v.employer_id
)
SELECT ae.employer_id,
  CASE
    WHEN ls.overall_compliance_status IS NOT NULL THEN
      CASE
        WHEN ls.overall_compliance_status::text = ANY (ARRAY['non_compliant','critical']::text[]) THEN 'Non-Compliant'
        WHEN ls.overall_compliance_status::text = 'partially_compliant' AND ls.compliance_status::text = 'under_review' THEN 'Under Review'
        WHEN ls.overall_compliance_status::text = 'partially_compliant' THEN 'Minor Issues'
        WHEN ls.overall_compliance_status::text = 'compliant' THEN 'Compliant'
        ELSE 'Under Review'
      END
    WHEN ov.max_sev IS NULL THEN 'Compliant'
    WHEN ov.max_sev >= 3 THEN 'Non-Compliant'
    WHEN ov.max_sev = 2 THEN 'Under Review'
    WHEN ov.max_sev = 1 THEN 'Minor Issues'
    ELSE 'Compliant'
  END AS bucket
FROM active_employers ae
LEFT JOIN latest_status ls ON ls.employer_id::text = ae.employer_id
LEFT JOIN open_violations ov ON ov.employer_id::text = ae.employer_id;

CREATE OR REPLACE VIEW public.dashboard_v_compliance_distribution AS
WITH base AS (
  SELECT bucket FROM public.dashboard_v_employer_compliance_status
), buckets(name, color, sort_order) AS (
  VALUES
    ('Compliant'::text,    'hsl(144 65% 34%)'::text, 1),
    ('Minor Issues'::text, 'hsl(44 90% 57%)'::text,  2),
    ('Under Review'::text, 'hsl(217 91% 60%)'::text, 3),
    ('Non-Compliant'::text,'hsl(2 74% 50%)'::text,   4)
)
SELECT b.name,
       COALESCE(c.cnt, 0) AS value,
       b.color
FROM buckets b
LEFT JOIN (
  SELECT bucket, count(*)::integer AS cnt
  FROM base
  GROUP BY bucket
) c ON c.bucket = b.name
ORDER BY b.sort_order;

CREATE OR REPLACE VIEW public.dashboard_v_compliance_metrics AS
SELECT
  (SELECT count(*)::integer FROM public.er_master WHERE status = 'A'::bpchar) AS total_employers,
  (SELECT count(*)::integer FROM public.dashboard_v_employer_compliance_status WHERE bucket = 'Compliant') AS compliant_employers,
  (SELECT count(*)::integer FROM public.ce_violations
    WHERE (status::text <> ALL (ARRAY['RESOLVED','CLOSED','DISMISSED']::text[]))
      AND (is_deleted = false OR is_deleted IS NULL)) AS active_violations,
  (SELECT count(*)::integer FROM public.ce_inspections
    WHERE status::text = ANY (ARRAY['SCHEDULED','PENDING']::text[])) AS pending_audits;