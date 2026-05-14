
-- =====================================================
-- PHASE 1: COMPLIANCE MODULE SCHEMA HARDENING
-- =====================================================

-- 1A. ADD MISSING AUDIT COLUMNS
-- -----------------------------------------------------

-- ce_arrangement_breaches: missing all audit columns
ALTER TABLE public.ce_arrangement_breaches
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by VARCHAR,
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR;

-- ce_case_violations: missing created_at, updated_at
ALTER TABLE public.ce_case_violations
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ce_inspection_findings: missing updated_at, updated_by
ALTER TABLE public.ce_inspection_findings
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR;

-- ce_violation_history: add created_at alias (performed_at exists but adding for consistency)
-- ce_case_history: same pattern
-- These already have performed_at which serves as created_at, skipping duplication.

-- 1B. ADD FOREIGN KEY CONSTRAINTS
-- -----------------------------------------------------

-- ce_case_violations → ce_cases, ce_violations
ALTER TABLE public.ce_case_violations
  ADD CONSTRAINT fk_ce_case_violations_case 
    FOREIGN KEY (case_id) REFERENCES public.ce_cases(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_ce_case_violations_violation 
    FOREIGN KEY (violation_id) REFERENCES public.ce_violations(id) ON DELETE CASCADE;

-- ce_case_history → ce_cases
ALTER TABLE public.ce_case_history
  ADD CONSTRAINT fk_ce_case_history_case 
    FOREIGN KEY (case_id) REFERENCES public.ce_cases(id) ON DELETE CASCADE;

-- ce_violation_history → ce_violations
ALTER TABLE public.ce_violation_history
  ADD CONSTRAINT fk_ce_violation_history_violation 
    FOREIGN KEY (violation_id) REFERENCES public.ce_violations(id) ON DELETE CASCADE;

-- ce_arrangement_breaches → ce_payment_arrangements
ALTER TABLE public.ce_arrangement_breaches
  ADD CONSTRAINT fk_ce_arrangement_breaches_arrangement 
    FOREIGN KEY (arrangement_id) REFERENCES public.ce_payment_arrangements(id) ON DELETE CASCADE;

-- ce_inspection_findings → ce_inspections
ALTER TABLE public.ce_inspection_findings
  ADD CONSTRAINT fk_ce_inspection_findings_inspection 
    FOREIGN KEY (inspection_id) REFERENCES public.ce_inspections(id) ON DELETE CASCADE;

-- ce_inspection_findings → ce_violations (nullable)
ALTER TABLE public.ce_inspection_findings
  ADD CONSTRAINT fk_ce_inspection_findings_violation 
    FOREIGN KEY (violation_id) REFERENCES public.ce_violations(id) ON DELETE SET NULL;

-- ce_automation_runs → ce_automation_jobs
ALTER TABLE public.ce_automation_runs
  ADD CONSTRAINT fk_ce_automation_runs_job 
    FOREIGN KEY (job_id) REFERENCES public.ce_automation_jobs(id) ON DELETE CASCADE;

-- ce_penalty_calculations → ce_employer_financial_ledger (nullable)
ALTER TABLE public.ce_penalty_calculations
  ADD CONSTRAINT fk_ce_penalty_calculations_ledger_entry 
    FOREIGN KEY (ledger_entry_id) REFERENCES public.ce_employer_financial_ledger(id) ON DELETE SET NULL;

-- ce_notices → ce_cases, ce_violations (nullable)
ALTER TABLE public.ce_notices
  ADD CONSTRAINT fk_ce_notices_case 
    FOREIGN KEY (case_id) REFERENCES public.ce_cases(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_ce_notices_violation 
    FOREIGN KEY (violation_id) REFERENCES public.ce_violations(id) ON DELETE SET NULL;

-- ce_payment_arrangements → ce_cases (nullable)
ALTER TABLE public.ce_payment_arrangements
  ADD CONSTRAINT fk_ce_payment_arrangements_case 
    FOREIGN KEY (case_id) REFERENCES public.ce_cases(id) ON DELETE SET NULL;

-- ce_legal_escalations → ce_cases
ALTER TABLE public.ce_legal_escalations
  ADD CONSTRAINT fk_ce_legal_escalations_case 
    FOREIGN KEY (case_id) REFERENCES public.ce_cases(id) ON DELETE CASCADE;

-- ce_legal_documents → ce_legal_escalations
ALTER TABLE public.ce_legal_documents
  ADD CONSTRAINT fk_ce_legal_documents_escalation 
    FOREIGN KEY (escalation_id) REFERENCES public.ce_legal_escalations(id) ON DELETE CASCADE;

-- ce_risk_score_history → ce_risk_profiles
ALTER TABLE public.ce_risk_score_history
  ADD CONSTRAINT fk_ce_risk_score_history_profile 
    FOREIGN KEY (risk_profile_id) REFERENCES public.ce_risk_profiles(id) ON DELETE CASCADE;

-- ce_installments → ce_payment_arrangements
ALTER TABLE public.ce_installments
  ADD CONSTRAINT fk_ce_installments_arrangement 
    FOREIGN KEY (arrangement_id) REFERENCES public.ce_payment_arrangements(id) ON DELETE CASCADE;

-- ce_employer_financial_ledger self-reference for reversals
ALTER TABLE public.ce_employer_financial_ledger
  ADD CONSTRAINT fk_ce_ledger_reversal_of 
    FOREIGN KEY (reversal_of_id) REFERENCES public.ce_employer_financial_ledger(id) ON DELETE RESTRICT;

-- ce_risk_bands → ce_risk_policies
ALTER TABLE public.ce_risk_bands
  ADD CONSTRAINT fk_ce_risk_bands_policy 
    FOREIGN KEY (policy_id) REFERENCES public.ce_risk_policies(id) ON DELETE CASCADE;

-- ce_risk_policy_factors → ce_risk_policies, ce_risk_config
ALTER TABLE public.ce_risk_policy_factors
  ADD CONSTRAINT fk_ce_risk_policy_factors_policy 
    FOREIGN KEY (policy_id) REFERENCES public.ce_risk_policies(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_ce_risk_policy_factors_factor 
    FOREIGN KEY (factor_id) REFERENCES public.ce_risk_config(id) ON DELETE CASCADE;

-- ce_number_sequences → ce_number_templates
ALTER TABLE public.ce_number_sequences
  ADD CONSTRAINT fk_ce_number_sequences_template 
    FOREIGN KEY (template_id) REFERENCES public.ce_number_templates(id) ON DELETE CASCADE;

-- 1C. ADD ENUM VALUES
-- -----------------------------------------------------

ALTER TYPE public.ce_ledger_entry_type ADD VALUE IF NOT EXISTS 'OPENING_BALANCE';
ALTER TYPE public.ce_ledger_entry_type ADD VALUE IF NOT EXISTS 'TRANSFER_IN';

-- 1D. ADD COMPOSITE INDEXES FOR PERFORMANCE
-- -----------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_ce_ledger_employer_period 
  ON public.ce_employer_financial_ledger(employer_id, period);

CREATE INDEX IF NOT EXISTS idx_ce_violations_employer_status 
  ON public.ce_violations(employer_id, status);

CREATE INDEX IF NOT EXISTS idx_ce_penalty_calc_employer_period 
  ON public.ce_penalty_calculations(employer_id, period);

CREATE INDEX IF NOT EXISTS idx_ce_cases_employer_status 
  ON public.ce_cases(employer_id, status);

CREATE INDEX IF NOT EXISTS idx_ce_inspections_employer 
  ON public.ce_inspections(employer_id);

CREATE INDEX IF NOT EXISTS idx_ce_inspections_status 
  ON public.ce_inspections(status);

CREATE INDEX IF NOT EXISTS idx_ce_notices_case 
  ON public.ce_notices(case_id);

CREATE INDEX IF NOT EXISTS idx_ce_installments_arrangement 
  ON public.ce_installments(arrangement_id);

CREATE INDEX IF NOT EXISTS idx_ce_legal_escalations_case 
  ON public.ce_legal_escalations(case_id);

CREATE INDEX IF NOT EXISTS idx_ce_arrangement_breaches_arrangement 
  ON public.ce_arrangement_breaches(arrangement_id);

-- 1E. ADD updated_at TRIGGERS
-- -----------------------------------------------------

-- Reuse existing update_updated_at_column function if it exists, otherwise create
CREATE OR REPLACE FUNCTION public.ce_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_ce_arrangement_breaches_updated_at
  BEFORE UPDATE ON public.ce_arrangement_breaches
  FOR EACH ROW EXECUTE FUNCTION public.ce_update_updated_at();

CREATE TRIGGER trg_ce_case_violations_updated_at
  BEFORE UPDATE ON public.ce_case_violations
  FOR EACH ROW EXECUTE FUNCTION public.ce_update_updated_at();

CREATE TRIGGER trg_ce_inspection_findings_updated_at
  BEFORE UPDATE ON public.ce_inspection_findings
  FOR EACH ROW EXECUTE FUNCTION public.ce_update_updated_at();

-- 1F. CREATE LEDGER REVERSALS VIEW
-- -----------------------------------------------------

CREATE OR REPLACE VIEW public.ce_ledger_reversals_v AS
SELECT 
  r.id AS reversal_entry_id,
  r.employer_id,
  r.employer_name,
  r.entry_type AS reversal_entry_type,
  r.fund_type,
  r.period,
  r.debit_amount AS reversal_debit,
  r.credit_amount AS reversal_credit,
  r.description AS reversal_description,
  r.reversal_reason,
  r.posted_by AS reversed_by,
  r.posted_at AS reversed_at,
  o.id AS original_entry_id,
  o.entry_type AS original_entry_type,
  o.debit_amount AS original_debit,
  o.credit_amount AS original_credit,
  o.description AS original_description,
  o.posted_by AS original_posted_by,
  o.posted_at AS original_posted_at
FROM public.ce_employer_financial_ledger r
JOIN public.ce_employer_financial_ledger o ON r.reversal_of_id = o.id
WHERE r.reversal_of_id IS NOT NULL;
