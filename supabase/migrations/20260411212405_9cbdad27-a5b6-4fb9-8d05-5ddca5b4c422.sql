
-- 1. Admin KPI summary
CREATE OR REPLACE VIEW public.dashboard_v_admin_kpis AS
SELECT
  (SELECT count(*) FROM er_master WHERE status = 'A')::int AS total_employers,
  (SELECT coalesce(sum(coalesce(males_employed,0) + coalesce(females_employed,0)), 0) FROM er_master WHERE status = 'A')::int AS insured_persons,
  (SELECT count(*) FROM cl_head WHERE status IN ('A','P','O'))::int AS active_claims,
  (SELECT count(*) FROM ce_violations WHERE status NOT IN ('RESOLVED','CLOSED','DISMISSED') AND (is_deleted = false OR is_deleted IS NULL))::int AS compliance_issues;

-- 2. Financial summary
CREATE OR REPLACE VIEW public.dashboard_v_financial_summary AS
SELECT
  coalesce((SELECT sum(coalesce(emp_ss_amt_rpt,0) + coalesce(emp_pe_amt_rpt,0) + coalesce(emp_levy_amt_rpt,0)) FROM cn_c3_reported WHERE period >= date_trunc('month', now())::date), 0)::numeric AS monthly_contributions,
  coalesce((SELECT sum(coalesce(benefit_amount,0)) FROM cl_head WHERE date_approved >= date_trunc('month', now())), 0)::numeric AS benefits_paid_mtd,
  (coalesce((SELECT sum(coalesce(emp_ss_amt_rpt,0) + coalesce(emp_pe_amt_rpt,0) + coalesce(emp_levy_amt_rpt,0)) FROM cn_c3_reported WHERE period >= date_trunc('month', now())::date), 0)
    - coalesce((SELECT sum(coalesce(benefit_amount,0)) FROM cl_head WHERE date_approved >= date_trunc('month', now())), 0))::numeric AS net_surplus,
  coalesce((SELECT sum(coalesce(total_amount,0)) FROM ce_violations WHERE status NOT IN ('RESOLVED','CLOSED','DISMISSED') AND (is_deleted = false OR is_deleted IS NULL)), 0)::numeric AS outstanding_arrears;

-- 3. Contribution trend (last 12 months)
CREATE OR REPLACE VIEW public.dashboard_v_contribution_trend AS
WITH months AS (
  SELECT to_char(d, 'YYYY-MM') AS month_key,
         to_char(d, 'Mon') AS month_label
  FROM generate_series(
    date_trunc('month', now() - interval '11 months'),
    date_trunc('month', now()),
    interval '1 month'
  ) d
),
c3 AS (
  SELECT
    to_char(period, 'YYYY-MM') AS month_key,
    sum(coalesce(emp_ss_amt_rpt,0) + coalesce(emp_pe_amt_rpt,0) + coalesce(emp_levy_amt_rpt,0)) AS contributions
  FROM cn_c3_reported
  WHERE period >= (date_trunc('month', now() - interval '11 months'))::date
  GROUP BY 1
),
claims AS (
  SELECT
    to_char(date_approved, 'YYYY-MM') AS month_key,
    sum(coalesce(benefit_amount,0)) AS benefits
  FROM cl_head
  WHERE date_approved >= date_trunc('month', now() - interval '11 months')
  GROUP BY 1
)
SELECT
  m.month_label AS month,
  m.month_key,
  coalesce(c.contributions, 0)::numeric AS contributions,
  coalesce(cl.benefits, 0)::numeric AS benefits
FROM months m
LEFT JOIN c3 c ON c.month_key = m.month_key
LEFT JOIN claims cl ON cl.month_key = m.month_key
ORDER BY m.month_key;

-- 4. Compliance distribution
CREATE OR REPLACE VIEW public.dashboard_v_compliance_distribution AS
SELECT name, value, color FROM (
  VALUES
    ('Compliant', (SELECT count(*) FROM er_master WHERE status = 'A' AND regno NOT IN (
      SELECT DISTINCT employer_id FROM ce_violations WHERE status NOT IN ('RESOLVED','CLOSED','DISMISSED') AND (is_deleted = false OR is_deleted IS NULL) AND employer_id IS NOT NULL
    ))::int, 'hsl(144 65% 34%)'),
    ('Minor Issues', (SELECT count(DISTINCT employer_id) FROM ce_violations WHERE severity = 'LOW' AND status NOT IN ('RESOLVED','CLOSED','DISMISSED') AND (is_deleted = false OR is_deleted IS NULL) AND employer_id IS NOT NULL)::int, 'hsl(44 90% 57%)'),
    ('Non-Compliant', (SELECT count(DISTINCT employer_id) FROM ce_violations WHERE severity IN ('HIGH','CRITICAL') AND status NOT IN ('RESOLVED','CLOSED','DISMISSED') AND (is_deleted = false OR is_deleted IS NULL) AND employer_id IS NOT NULL)::int, 'hsl(2 74% 50%)'),
    ('Under Review', (SELECT count(DISTINCT employer_id) FROM ce_violations WHERE severity = 'MEDIUM' AND status NOT IN ('RESOLVED','CLOSED','DISMISSED') AND (is_deleted = false OR is_deleted IS NULL) AND employer_id IS NOT NULL)::int, 'hsl(217 91% 60%)')
) AS t(name, value, color);

-- 5. Registration pipeline
CREATE OR REPLACE VIEW public.dashboard_v_registration_pipeline AS
SELECT stage, count, fill FROM (
  VALUES
    ('Active', (SELECT count(*) FROM er_master WHERE status = 'A')::int, 'hsl(144 65% 34%)'),
    ('Pending', (SELECT count(*) FROM er_master WHERE status = 'P')::int, 'hsl(44 90% 57%)'),
    ('Suspended', (SELECT count(*) FROM er_master WHERE status = 'S')::int, 'hsl(217 91% 60%)'),
    ('Terminated', (SELECT count(*) FROM er_master WHERE status = 'T')::int, 'hsl(2 74% 50%)'),
    ('De-registered', (SELECT count(*) FROM er_master WHERE status = 'D')::int, 'hsl(153 73% 21%)')
) AS t(stage, count, fill);

-- 6. Benefits distribution
CREATE OR REPLACE VIEW public.dashboard_v_benefits_distribution AS
SELECT
  CASE claim_type_code
    WHEN 'S' THEN 'Sickness'
    WHEN 'M' THEN 'Maternity'
    WHEN 'A' THEN 'Age'
    WHEN 'I' THEN 'Invalidity'
    WHEN 'F' THEN 'Funeral'
    WHEN 'E' THEN 'Employment Injury'
    WHEN 'V' THEN 'Survivors'
    ELSE coalesce(claim_type_code, 'Other')
  END AS type,
  coalesce(sum(benefit_amount), 0)::numeric AS amount,
  count(*)::int AS claim_count
FROM cl_head
GROUP BY claim_type_code
ORDER BY amount DESC;

-- 7. Active alerts
CREATE OR REPLACE VIEW public.dashboard_v_active_alerts AS
(
  SELECT 
    'critical'::text AS severity,
    count(*) || ' violations overdue' AS title,
    'Past due date and unresolved' AS detail,
    'Action required' AS time_label
  FROM ce_violations
  WHERE due_date < now() AND status NOT IN ('RESOLVED','CLOSED','DISMISSED') AND (is_deleted = false OR is_deleted IS NULL)
  HAVING count(*) > 0
)
UNION ALL
(
  SELECT
    'warning'::text,
    count(*) || ' inspections pending',
    'Scheduled inspections not yet started',
    'Review'
  FROM ce_inspections
  WHERE status IN ('SCHEDULED','PENDING') AND scheduled_date <= (now() + interval '7 days')::date
  HAVING count(*) > 0
)
UNION ALL
(
  SELECT
    'warning'::text,
    count(*) || ' active breach monitors',
    'Payment arrangements at risk',
    'Monitor'
  FROM ce_breach_monitoring
  WHERE status = 'ACTIVE'
  HAVING count(*) > 0
);

-- 8. Recent activity
CREATE OR REPLACE VIEW public.dashboard_v_recent_activity AS
SELECT activity_type, action, entity, occurred_at FROM (
  SELECT
    'violation'::text AS activity_type,
    'Compliance violation: ' || coalesce(summary, violation_number) AS action,
    coalesce(employer_name, 'Unknown') || ' – ' || violation_number AS entity,
    created_at AS occurred_at
  FROM ce_violations
  WHERE is_deleted = false OR is_deleted IS NULL
  UNION ALL
  SELECT
    'inspection'::text,
    'Inspection ' || coalesce(status,'') || ': ' || coalesce(inspection_type,''),
    coalesce(employer_name, 'Unknown') || ' – ' || coalesce(inspector_name,''),
    coalesce(actual_start, scheduled_date::timestamp)
  FROM ce_inspections
) sub
ORDER BY occurred_at DESC
LIMIT 10;

-- 9. Compliance dashboard metrics
CREATE OR REPLACE VIEW public.dashboard_v_compliance_metrics AS
SELECT
  (SELECT count(*) FROM er_master WHERE status = 'A')::int AS total_employers,
  (SELECT count(*) FROM er_master WHERE status = 'A' AND regno NOT IN (
    SELECT DISTINCT employer_id FROM ce_violations WHERE status NOT IN ('RESOLVED','CLOSED','DISMISSED') AND (is_deleted = false OR is_deleted IS NULL) AND employer_id IS NOT NULL
  ))::int AS compliant_employers,
  (SELECT count(*) FROM ce_violations WHERE status NOT IN ('RESOLVED','CLOSED','DISMISSED') AND (is_deleted = false OR is_deleted IS NULL))::int AS active_violations,
  (SELECT count(*) FROM ce_inspections WHERE status IN ('SCHEDULED','PENDING'))::int AS pending_audits;

-- 10. Sector compliance
CREATE OR REPLACE VIEW public.dashboard_v_sector_compliance AS
SELECT
  coalesce(e.sector_code, 'Unknown') AS sector,
  count(*)::int AS total,
  (count(*) FILTER (WHERE e.regno NOT IN (
    SELECT DISTINCT employer_id FROM ce_violations 
    WHERE status NOT IN ('RESOLVED','CLOSED','DISMISSED') AND (is_deleted = false OR is_deleted IS NULL) AND employer_id IS NOT NULL
  )))::int AS compliant,
  CASE WHEN count(*) > 0 
    THEN (round(100.0 * count(*) FILTER (WHERE e.regno NOT IN (
      SELECT DISTINCT employer_id FROM ce_violations 
      WHERE status NOT IN ('RESOLVED','CLOSED','DISMISSED') AND (is_deleted = false OR is_deleted IS NULL) AND employer_id IS NOT NULL
    )) / count(*)))::int
    ELSE 100
  END AS rate
FROM er_master e
WHERE e.status = 'A'
GROUP BY e.sector_code
ORDER BY total DESC;
