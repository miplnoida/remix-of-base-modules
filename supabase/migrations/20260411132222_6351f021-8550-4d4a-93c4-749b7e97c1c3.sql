
-- Drop view first (depends on columns being renamed)
DROP VIEW IF EXISTS public.ce_employer_profile_view;

-- 1. Extend ce_employer_compliance_status
ALTER TABLE public.ce_employer_compliance_status
  ADD COLUMN IF NOT EXISTS filing_status VARCHAR DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS overall_compliance_status VARCHAR DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS current_arrears_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_penalty_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_filing_period VARCHAR,
  ADD COLUMN IF NOT EXISTS last_payment_date DATE,
  ADD COLUMN IF NOT EXISTS active_case_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_violation_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_arrangement_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_computed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS computed_by VARCHAR DEFAULT 'SYSTEM';

ALTER TABLE public.ce_employer_compliance_status
  ADD CONSTRAINT chk_filing_status CHECK (filing_status IN ('current','late','delinquent','never_filed','unknown')),
  ADD CONSTRAINT chk_payment_status CHECK (payment_status IN ('current','late','delinquent','never_paid','unknown')),
  ADD CONSTRAINT chk_overall_compliance CHECK (overall_compliance_status IN ('compliant','partially_compliant','non_compliant','critical','unknown'));

CREATE INDEX IF NOT EXISTS idx_ce_ecstat_filing ON public.ce_employer_compliance_status(filing_status);
CREATE INDEX IF NOT EXISTS idx_ce_ecstat_payment ON public.ce_employer_compliance_status(payment_status);
CREATE INDEX IF NOT EXISTS idx_ce_ecstat_overall ON public.ce_employer_compliance_status(overall_compliance_status);

-- 2. Extend ce_risk_profiles
ALTER TABLE public.ce_risk_profiles
  ADD COLUMN IF NOT EXISTS scoring_version VARCHAR DEFAULT 'v1.0',
  ADD COLUMN IF NOT EXISTS enforcement_risk_score NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS assessed_by VARCHAR DEFAULT 'SYSTEM';

-- 3. Extend ce_employer_compliance_flags
ALTER TABLE public.ce_employer_compliance_flags
  ADD COLUMN IF NOT EXISTS flag_name VARCHAR,
  ADD COLUMN IF NOT EXISTS source_type VARCHAR,
  ADD COLUMN IF NOT EXISTS source_reference VARCHAR,
  ADD COLUMN IF NOT EXISTS effective_from DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS effective_to DATE;

-- 4. Extend ce_employer_status_history
ALTER TABLE public.ce_employer_status_history
  ADD COLUMN IF NOT EXISTS change_reason TEXT,
  ADD COLUMN IF NOT EXISTS source_type VARCHAR;

-- 5. Unique index for risk profiles upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_ce_risk_profiles_employer_unique
  ON public.ce_risk_profiles(employer_id);

-- 6. ce_recompute_employer_compliance
CREATE OR REPLACE FUNCTION public.ce_recompute_employer_compliance(
  p_employer_id VARCHAR,
  p_triggered_by VARCHAR DEFAULT 'SYSTEM'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_debits NUMERIC(15,2) := 0;
  v_credits NUMERIC(15,2) := 0;
  v_balance NUMERIC(15,2) := 0;
  v_open_cases INT := 0;
  v_open_violations INT := 0;
  v_open_arrangements INT := 0;
  v_last_payment DATE;
  v_filing_status VARCHAR := 'unknown';
  v_payment_status VARCHAR := 'unknown';
  v_overall VARCHAR := 'unknown';
  v_existing_id UUID;
BEGIN
  SELECT COALESCE(SUM(COALESCE(debit_amount,0)),0), COALESCE(SUM(COALESCE(credit_amount,0)),0)
  INTO v_debits, v_credits
  FROM public.ce_employer_financial_ledger
  WHERE employer_id = p_employer_id AND reversal_of_id IS NULL;
  v_balance := v_debits - v_credits;

  SELECT COUNT(*) INTO v_open_cases FROM public.ce_cases
  WHERE employer_id = p_employer_id AND status NOT IN ('closed','cancelled','resolved') AND NOT COALESCE(is_deleted,false);

  SELECT COUNT(*) INTO v_open_violations FROM public.ce_violations
  WHERE employer_id = p_employer_id AND status NOT IN ('closed','cancelled','resolved','dismissed') AND NOT COALESCE(is_deleted,false);

  SELECT MAX(posted_at::date) INTO v_last_payment FROM public.ce_employer_financial_ledger
  WHERE employer_id = p_employer_id AND entry_type = 'PAYMENT_RECEIVED' AND reversal_of_id IS NULL;

  v_payment_status := CASE
    WHEN v_last_payment IS NULL THEN 'never_paid'
    WHEN v_last_payment < CURRENT_DATE - INTERVAL '60 days' THEN 'delinquent'
    WHEN v_last_payment < CURRENT_DATE - INTERVAL '30 days' THEN 'late'
    ELSE 'current' END;

  v_overall := CASE
    WHEN v_balance <= 0 AND v_open_violations = 0 AND v_open_cases = 0 THEN 'compliant'
    WHEN v_balance > 500000 OR v_open_violations > 5 THEN 'critical'
    WHEN v_balance > 0 OR v_open_violations > 0 THEN 'non_compliant'
    ELSE 'partially_compliant' END;

  SELECT id INTO v_existing_id FROM public.ce_employer_compliance_status
  WHERE employer_id = p_employer_id AND effective_to IS NULL LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.ce_employer_compliance_status SET
      filing_status = v_filing_status, payment_status = v_payment_status,
      overall_compliance_status = v_overall, compliance_status = v_overall,
      current_arrears_amount = GREATEST(v_balance,0), current_penalty_amount = v_credits,
      last_payment_date = v_last_payment,
      active_case_count = v_open_cases, active_violation_count = v_open_violations,
      active_arrangement_count = v_open_arrangements,
      last_computed_at = now(), computed_by = p_triggered_by, updated_by = p_triggered_by
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.ce_employer_compliance_status (
      employer_id, compliance_status, filing_status, payment_status,
      overall_compliance_status, current_arrears_amount, current_penalty_amount,
      last_payment_date, active_case_count, active_violation_count,
      active_arrangement_count, last_computed_at, computed_by, created_by
    ) VALUES (
      p_employer_id, v_overall, v_filing_status, v_payment_status,
      v_overall, GREATEST(v_balance,0), v_credits,
      v_last_payment, v_open_cases, v_open_violations,
      v_open_arrangements, now(), p_triggered_by, p_triggered_by
    );
  END IF;

  RETURN jsonb_build_object(
    'employer_id', p_employer_id, 'overall_status', v_overall,
    'filing_status', v_filing_status, 'payment_status', v_payment_status,
    'arrears', v_balance, 'open_cases', v_open_cases,
    'open_violations', v_open_violations, 'computed_at', now());
END;
$$;

-- 7. ce_recompute_employer_risk
CREATE OR REPLACE FUNCTION public.ce_recompute_employer_risk(
  p_employer_id VARCHAR,
  p_triggered_by VARCHAR DEFAULT 'SYSTEM'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cs RECORD;
  v_arrears_s NUMERIC(5,2); v_violation_s NUMERIC(5,2); v_filing_s NUMERIC(5,2);
  v_payment_s NUMERIC(5,2); v_enforcement_s NUMERIC(5,2); v_legal_s NUMERIC(5,2);
  v_total NUMERIC(5,2); v_band VARCHAR; v_name VARCHAR; v_terr VARCHAR;
BEGIN
  SELECT * INTO v_cs FROM public.ce_employer_compliance_status
  WHERE employer_id = p_employer_id AND effective_to IS NULL LIMIT 1;
  IF v_cs IS NULL THEN
    RETURN jsonb_build_object('error','Run ce_recompute_employer_compliance first');
  END IF;

  SELECT name, village_code INTO v_name, v_terr FROM public.er_master WHERE regno = p_employer_id LIMIT 1;

  v_arrears_s := CASE
    WHEN COALESCE(v_cs.current_arrears_amount,0) > 500000 THEN 100
    WHEN COALESCE(v_cs.current_arrears_amount,0) > 150000 THEN 80
    WHEN COALESCE(v_cs.current_arrears_amount,0) > 50000 THEN 60
    WHEN COALESCE(v_cs.current_arrears_amount,0) > 10000 THEN 40
    WHEN COALESCE(v_cs.current_arrears_amount,0) > 0 THEN 20
    ELSE 0 END;
  v_violation_s := LEAST(COALESCE(v_cs.active_violation_count,0)*20, 100);
  v_filing_s := CASE v_cs.filing_status WHEN 'never_filed' THEN 100 WHEN 'delinquent' THEN 80 WHEN 'late' THEN 50 WHEN 'current' THEN 0 ELSE 50 END;
  v_payment_s := CASE v_cs.payment_status WHEN 'never_paid' THEN 100 WHEN 'delinquent' THEN 80 WHEN 'late' THEN 50 WHEN 'current' THEN 0 ELSE 50 END;
  v_enforcement_s := LEAST((COALESCE(v_cs.active_case_count,0)*25)+(COALESCE(v_cs.active_arrangement_count,0)*10), 100);
  v_legal_s := CASE WHEN COALESCE(v_cs.active_case_count,0) > 2 THEN 80 WHEN COALESCE(v_cs.active_case_count,0) > 0 THEN 40 ELSE 0 END;
  v_total := (v_arrears_s*0.25)+(v_violation_s*0.25)+(v_filing_s*0.20)+(v_payment_s*0.20)+(v_legal_s*0.10);
  v_band := CASE WHEN v_total >= 80 THEN 'Critical' WHEN v_total >= 60 THEN 'High' WHEN v_total >= 40 THEN 'Medium' ELSE 'Low' END;

  INSERT INTO public.ce_risk_profiles (
    employer_id, employer_name, territory, arrears_score, violation_score, filing_score,
    payment_behavior_score, legal_history_score, enforcement_risk_score,
    total_score, risk_band, scoring_version, last_calculated_at, next_review_date,
    assessed_by, created_by, updated_by
  ) VALUES (
    p_employer_id, v_name, v_terr, v_arrears_s, v_violation_s, v_filing_s,
    v_payment_s, v_legal_s, v_enforcement_s,
    v_total, v_band, 'v1.0', now(), CURRENT_DATE + INTERVAL '30 days',
    p_triggered_by, p_triggered_by, p_triggered_by
  )
  ON CONFLICT (employer_id) DO UPDATE SET
    employer_name = EXCLUDED.employer_name, territory = EXCLUDED.territory,
    arrears_score = EXCLUDED.arrears_score, violation_score = EXCLUDED.violation_score,
    filing_score = EXCLUDED.filing_score, payment_behavior_score = EXCLUDED.payment_behavior_score,
    legal_history_score = EXCLUDED.legal_history_score, enforcement_risk_score = EXCLUDED.enforcement_risk_score,
    total_score = EXCLUDED.total_score,
    risk_band = CASE WHEN ce_risk_profiles.override_band IS NOT NULL THEN ce_risk_profiles.risk_band ELSE EXCLUDED.risk_band END,
    scoring_version = EXCLUDED.scoring_version, last_calculated_at = now(),
    next_review_date = CURRENT_DATE + INTERVAL '30 days',
    assessed_by = EXCLUDED.assessed_by, updated_by = EXCLUDED.updated_by, updated_at = now();

  RETURN jsonb_build_object('employer_id', p_employer_id, 'total_score', v_total, 'risk_band', v_band);
END;
$$;

-- 8. ce_batch_recompute_compliance
CREATE OR REPLACE FUNCTION public.ce_batch_recompute_compliance(
  p_employer_ids VARCHAR[] DEFAULT NULL,
  p_territory VARCHAR DEFAULT NULL,
  p_limit INT DEFAULT 500,
  p_triggered_by VARCHAR DEFAULT 'SYSTEM'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emp RECORD; v_processed INT := 0; v_failed INT := 0;
  v_errors JSONB := '[]'::jsonb;
BEGIN
  FOR v_emp IN
    SELECT regno FROM public.er_master
    WHERE (p_employer_ids IS NULL OR regno = ANY(p_employer_ids))
      AND (p_territory IS NULL OR village_code = p_territory)
    ORDER BY regno LIMIT p_limit
  LOOP
    BEGIN
      PERFORM public.ce_recompute_employer_compliance(v_emp.regno, p_triggered_by);
      PERFORM public.ce_recompute_employer_risk(v_emp.regno, p_triggered_by);
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      v_errors := v_errors || jsonb_build_object('employer_id', v_emp.regno, 'error', SQLERRM);
    END;
  END LOOP;
  RETURN jsonb_build_object('processed', v_processed, 'failed', v_failed, 'errors', v_errors, 'completed_at', now());
END;
$$;

-- 9. Recreate profile view with new columns
CREATE OR REPLACE VIEW public.ce_employer_profile_view AS
SELECT
  em.regno AS employer_id, em.name AS employer_name, em.status AS master_status,
  em.sector_code, em.village_code AS territory, em.office_code, em.inspector_code,
  em.phone, em.email, em.hq_addr1, em.hq_addr2,
  em.registration_date, em.trade_name, em.ownership_code,
  em.males_employed, em.females_employed,
  cs.compliance_status, cs.filing_status, cs.payment_status, cs.overall_compliance_status,
  cs.current_arrears_amount, cs.current_penalty_amount,
  cs.last_filing_period, cs.last_payment_date,
  cs.active_case_count, cs.active_violation_count, cs.active_arrangement_count,
  cs.effective_from AS compliance_effective_from,
  cs.assigned_officer_id, cs.review_due_date,
  cs.last_computed_at, cs.computed_by,
  rp.total_score AS risk_score,
  COALESCE(rp.override_band, rp.risk_band) AS risk_band,
  rp.scoring_version,
  rp.arrears_score, rp.violation_score, rp.filing_score,
  rp.payment_behavior_score, rp.legal_history_score, rp.enforcement_risk_score,
  rp.last_calculated_at AS risk_last_calculated,
  rp.next_review_date AS risk_next_review,
  rp.assessed_by AS risk_assessed_by,
  COALESCE(la.total_debits,0) AS total_debits,
  COALESCE(la.total_credits,0) AS total_credits,
  COALESCE(la.total_debits,0) - COALESCE(la.total_credits,0) AS outstanding_balance,
  COALESCE(fa.active_flags,0) AS active_flags_count,
  fa.critical_flags,
  COALESCE(ra.related_employers,0) AS related_employers_count
FROM public.er_master em
LEFT JOIN public.ce_employer_compliance_status cs ON cs.employer_id = em.regno AND cs.effective_to IS NULL
LEFT JOIN public.ce_risk_profiles rp ON rp.employer_id = em.regno
LEFT JOIN LATERAL (
  SELECT SUM(COALESCE(debit_amount,0)) AS total_debits, SUM(COALESCE(credit_amount,0)) AS total_credits
  FROM public.ce_employer_financial_ledger l WHERE l.employer_id = em.regno AND l.reversal_of_id IS NULL
) la ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS active_flags, COUNT(*) FILTER (WHERE severity = 'critical') AS critical_flags
  FROM public.ce_employer_compliance_flags f WHERE f.employer_id = em.regno AND f.is_active = true
) fa ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS related_employers FROM public.ce_employer_relationships r
  WHERE (r.parent_employer_id = em.regno OR r.child_employer_id = em.regno) AND r.is_active = true
) ra ON true;

COMMENT ON VIEW public.ce_employer_profile_view IS 'Read-only compliance workspace projection. er_master is NOT modified.';
