
-- Fix contribution trend to use COALESCE(rpt, calc) so existing C3 data flows through
CREATE OR REPLACE VIEW public.dashboard_v_contribution_trend AS
WITH months AS (
  SELECT to_char(d.d, 'YYYY-MM') AS month_key,
         to_char(d.d, 'Mon') AS month_label
  FROM generate_series(
    date_trunc('month', now() - interval '11 months'),
    date_trunc('month', now()),
    interval '1 month'
  ) d(d)
),
c3 AS (
  SELECT to_char(period, 'YYYY-MM') AS month_key,
         sum(
           COALESCE(emp_ss_amt_rpt, emp_ss_amt_calc, 0) +
           COALESCE(emp_pe_amt_rpt, emp_pe_amt_calc, 0) +
           COALESCE(emp_levy_amt_rpt, emp_levy_amt_calc, 0)
         ) AS contributions
  FROM cn_c3_reported
  WHERE period >= date_trunc('month', now() - interval '11 months')::date
  GROUP BY to_char(period, 'YYYY-MM')
),
claims AS (
  SELECT to_char(date_approved, 'YYYY-MM') AS month_key,
         sum(COALESCE(benefit_amount, 0)) AS benefits
  FROM cl_head
  WHERE date_approved >= date_trunc('month', now() - interval '11 months')
  GROUP BY to_char(date_approved, 'YYYY-MM')
)
SELECT m.month_label AS month,
       m.month_key,
       COALESCE(c.contributions, 0) AS contributions,
       COALESCE(cl.benefits, 0) AS benefits
FROM months m
LEFT JOIN c3 c ON c.month_key = m.month_key
LEFT JOIN claims cl ON cl.month_key = m.month_key
ORDER BY m.month_key;

-- Fix financial summary to use same COALESCE logic
CREATE OR REPLACE VIEW public.dashboard_v_financial_summary AS
SELECT
  COALESCE((
    SELECT sum(
      COALESCE(emp_ss_amt_rpt, emp_ss_amt_calc, 0) +
      COALESCE(emp_pe_amt_rpt, emp_pe_amt_calc, 0) +
      COALESCE(emp_levy_amt_rpt, emp_levy_amt_calc, 0)
    )
    FROM cn_c3_reported
    WHERE period >= date_trunc('month', now())::date
  ), 0) AS monthly_contributions,
  COALESCE((
    SELECT sum(COALESCE(benefit_amount, 0))
    FROM cl_head
    WHERE date_approved >= date_trunc('month', now())
  ), 0) AS benefits_paid_mtd,
  COALESCE((
    SELECT sum(
      COALESCE(emp_ss_amt_rpt, emp_ss_amt_calc, 0) +
      COALESCE(emp_pe_amt_rpt, emp_pe_amt_calc, 0) +
      COALESCE(emp_levy_amt_rpt, emp_levy_amt_calc, 0)
    )
    FROM cn_c3_reported
    WHERE period >= date_trunc('month', now())::date
  ), 0) -
  COALESCE((
    SELECT sum(COALESCE(benefit_amount, 0))
    FROM cl_head
    WHERE date_approved >= date_trunc('month', now())
  ), 0) AS net_surplus,
  COALESCE((
    SELECT sum(COALESCE(total_amount, 0))
    FROM ce_violations
    WHERE status NOT IN ('RESOLVED','CLOSED','DISMISSED')
      AND (is_deleted = false OR is_deleted IS NULL)
  ), 0) AS outstanding_arrears;
