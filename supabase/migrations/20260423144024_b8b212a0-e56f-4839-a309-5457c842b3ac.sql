-- Align dependent compliance dashboard views with the canonical base view.
-- Non-destructive: CREATE OR REPLACE only; no DROPs.

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
  (SELECT count(*)::integer FROM public.dashboard_v_employer_compliance_status WHERE bucket = 'Compliant'::text) AS compliant_employers,
  (SELECT count(*)::integer FROM public.ce_violations
    WHERE (status::text <> ALL (ARRAY['RESOLVED','CLOSED','DISMISSED']::text[]))
      AND (is_deleted = false OR is_deleted IS NULL)) AS active_violations,
  (SELECT count(*)::integer FROM public.ce_inspections
    WHERE status::text = ANY (ARRAY['SCHEDULED','PENDING']::text[])) AS pending_audits;