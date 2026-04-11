
-- Payment arrangement risk summary
CREATE OR REPLACE VIEW public.dashboard_v_payment_arrangement_risk AS
SELECT
  COALESCE(pa.status, 'UNKNOWN') AS risk_status,
  COUNT(*)::int AS arrangement_count,
  COALESCE(SUM(pa.total_debt), 0)::numeric AS total_debt,
  COALESCE(SUM(pa.total_paid), 0)::numeric AS total_paid,
  COALESCE(SUM(pa.missed_payments), 0)::int AS total_missed_payments
FROM public.ce_payment_arrangements pa
GROUP BY pa.status;

-- Legal escalation summary
CREATE OR REPLACE VIEW public.dashboard_v_legal_escalation_summary AS
SELECT
  COALESCE(le.current_stage, 'UNKNOWN') AS escalation_stage,
  COUNT(*)::int AS escalation_count,
  COALESCE(SUM(le.amount_in_dispute), 0)::numeric AS total_amount_in_dispute
FROM public.ce_legal_escalations le
GROUP BY le.current_stage;

-- Employer compliance alerts (high-risk or flagged employers)
CREATE OR REPLACE VIEW public.dashboard_v_employer_compliance_alerts AS
SELECT
  rp.employer_id,
  rp.employer_name,
  cs.overall_compliance_status,
  rp.total_score AS risk_score,
  COALESCE(rp.override_band, rp.risk_band) AS risk_band,
  cs.active_violation_count,
  cs.current_arrears_amount,
  cs.last_computed_at
FROM public.ce_risk_profiles rp
LEFT JOIN public.ce_employer_compliance_status cs ON cs.employer_id = rp.employer_id
WHERE COALESCE(rp.override_band, rp.risk_band) IN ('High', 'Critical')
   OR COALESCE(cs.active_violation_count, 0) > 0
ORDER BY rp.total_score DESC NULLS LAST
LIMIT 50;
