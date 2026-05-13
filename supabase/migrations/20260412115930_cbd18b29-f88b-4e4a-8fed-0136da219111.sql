
-- 1a) ce_v_employer_filing_status
CREATE OR REPLACE VIEW public.ce_v_employer_filing_status AS
WITH periods AS (
  SELECT generate_series(
    date_trunc('month', NOW() - INTERVAL '12 months')::date,
    date_trunc('month', NOW() - INTERVAL '1 month')::date,
    '1 month'::interval
  )::date AS period_date
),
employer_filings AS (
  SELECT
    e.regno,
    e.name AS employer_name,
    e.status AS employer_status,
    e.office_code,
    COUNT(DISTINCT c.period) AS total_filings_12m,
    MAX(c.period) AS last_filing_period,
    MAX(c.date_received) AS last_filing_date
  FROM er_master e
  LEFT JOIN cn_c3_reported c ON c.payer_id = e.regno
    AND c.period >= (NOW() - INTERVAL '12 months')::date
    AND c.posting_status IS DISTINCT FROM 'CANCELLED'
  WHERE e.status IN ('A', 'V')
  GROUP BY e.regno, e.name, e.status, e.office_code
)
SELECT
  ef.regno,
  ef.employer_name,
  ef.employer_status,
  ef.office_code,
  ef.total_filings_12m,
  (SELECT COUNT(*) FROM periods)::int - COALESCE(ef.total_filings_12m::int, 0) AS missed_filings_12m,
  ef.last_filing_period,
  ef.last_filing_date,
  (SELECT MAX(period_date) FROM periods) AS latest_period_due,
  CASE WHEN ef.last_filing_period >= (SELECT MAX(period_date) FROM periods) THEN true ELSE false END AS is_current
FROM employer_filings ef;

-- 1b) ce_v_employer_payment_status
CREATE OR REPLACE VIEW public.ce_v_employer_payment_status AS
SELECT
  e.regno,
  e.name AS employer_name,
  COUNT(DISTINCT cp.payment_id) AS total_payments_12m,
  COALESCE(SUM(cp.payment_amount), 0) AS total_amount_12m,
  MAX(cp.payment_date) AS last_payment_date,
  MAX(cp.period) AS last_payment_period,
  CASE WHEN MAX(cp.payment_date) >= (NOW() - INTERVAL '60 days') THEN true ELSE false END AS has_recent_payment
FROM er_master e
LEFT JOIN cn_payment_header cph ON cph.payer_id = e.regno
LEFT JOIN cn_payment cp ON cp.payment_id = cph.payment_id
  AND cp.payment_date >= (NOW() - INTERVAL '12 months')
WHERE e.status IN ('A', 'V')
GROUP BY e.regno, e.name;

-- 1c) ce_v_employer_arrears_summary
CREATE OR REPLACE VIEW public.ce_v_employer_arrears_summary AS
SELECT
  e.regno,
  e.name AS employer_name,
  COALESCE(cs.current_arrears_amount, 0) AS current_arrears,
  COALESCE(cs.current_penalty_amount, 0) AS current_penalty,
  COALESCE(cs.current_arrears_amount, 0) + COALESCE(cs.current_penalty_amount, 0) AS total_outstanding,
  CASE WHEN COALESCE(cs.current_arrears_amount, 0) > 0 THEN true ELSE false END AS has_arrears
FROM er_master e
LEFT JOIN ce_employer_compliance_status cs ON cs.employer_id = e.regno
WHERE e.status IN ('A', 'V', 'I', 'D');

-- 1d) ce_v_arrangement_health
CREATE OR REPLACE VIEW public.ce_v_arrangement_health AS
SELECT
  pa.id AS arrangement_id,
  pa.employer_id,
  pa.employer_name,
  pa.status,
  pa.total_debt,
  pa.total_paid,
  pa.installments_paid,
  pa.missed_payments,
  pa.max_missed_before_breach,
  pa.breach_detected,
  pa.next_due_date,
  COALESCE(ub.unresolved_breach_count, 0) AS unresolved_breach_count,
  CASE
    WHEN pa.status = 'Breached' THEN 'BREACHED'
    WHEN pa.breach_detected = true THEN 'AT_RISK'
    WHEN pa.missed_payments >= COALESCE(pa.max_missed_before_breach, 3) THEN 'AT_RISK'
    WHEN pa.missed_payments > 0 THEN 'WARNING'
    WHEN pa.status = 'Active' THEN 'HEALTHY'
    ELSE 'INACTIVE'
  END AS health_status
FROM ce_payment_arrangements pa
LEFT JOIN (
  SELECT arrangement_id, COUNT(*) AS unresolved_breach_count
  FROM ce_arrangement_breaches
  WHERE resolved_at IS NULL
  GROUP BY arrangement_id
) ub ON ub.arrangement_id = pa.id;

-- 1e) ce_v_employer_workforce
CREATE OR REPLACE VIEW public.ce_v_employer_workforce AS
WITH latest_c3 AS (
  SELECT DISTINCT ON (payer_id)
    payer_id,
    number_employed AS last_reported_employees,
    period AS last_reported_period
  FROM cn_c3_reported
  WHERE posting_status IS DISTINCT FROM 'CANCELLED'
  ORDER BY payer_id, period DESC
)
SELECT
  e.regno,
  e.name AS employer_name,
  COALESCE(e.males_employed, 0) AS registered_males,
  COALESCE(e.females_employed, 0) AS registered_females,
  COALESCE(e.males_employed, 0) + COALESCE(e.females_employed, 0) AS registered_total,
  COALESCE(lc.last_reported_employees, 0) AS last_reported_employees,
  lc.last_reported_period,
  COALESCE(lc.last_reported_employees, 0) - (COALESCE(e.males_employed, 0) + COALESCE(e.females_employed, 0)) AS employee_delta
FROM er_master e
LEFT JOIN latest_c3 lc ON lc.payer_id = e.regno
WHERE e.status IN ('A', 'V');

-- 1f) ce_v_employer_legal_status
CREATE OR REPLACE VIEW public.ce_v_employer_legal_status AS
SELECT
  e.regno,
  e.name AS employer_name,
  COALESCE(le.active_escalation_count, 0) AS active_escalation_count,
  COALESCE(su.active_suit_count, 0) AS active_suit_count,
  le.latest_stage,
  CASE WHEN COALESCE(le.active_escalation_count, 0) > 0 OR COALESCE(su.active_suit_count, 0) > 0 THEN true ELSE false END AS has_active_legal
FROM er_master e
LEFT JOIN (
  SELECT
    employer_id,
    COUNT(*) AS active_escalation_count,
    MAX(current_stage) AS latest_stage
  FROM ce_legal_escalations
  WHERE current_stage NOT IN ('Resolved', 'Dismissed', 'Withdrawn')
  GROUP BY employer_id
) le ON le.employer_id = e.regno
LEFT JOIN (
  SELECT
    regno,
    COUNT(*) AS active_suit_count
  FROM er_suit
  WHERE suit_status NOT IN ('C', 'D')
  GROUP BY regno
) su ON su.regno = e.regno
WHERE e.status IN ('A', 'V', 'I', 'D');

-- STEP 3: Fix ce_automation_runs schema
ALTER TABLE public.ce_automation_runs
  ADD COLUMN IF NOT EXISTS is_dry_run BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS parameters JSONB;
