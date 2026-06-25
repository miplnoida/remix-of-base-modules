-- Relax lg_case_action constraints so referral-driven action kinds (SS_*, LV_*, PE_*, BENEFIT_*, ESTATE_*, etc.)
-- can be inserted by the legal-case enrichment / repair service.
ALTER TABLE public.lg_case_action DROP CONSTRAINT IF EXISTS lg_case_action_action_kind_check;
ALTER TABLE public.lg_case_action ADD CONSTRAINT lg_case_action_action_kind_check
  CHECK (action_kind IN (
    'LIABILITY','BENEFIT',
    'SS_CONTRIBUTION','SS_PENALTY',
    'LV_CONTRIBUTION','LV_PENALTY',
    'PE_CONTRIBUTION','PE_PENALTY',
    'HSD_LEVY_CONTRIBUTION','HSD_LEVY_PENALTY',
    'SEVERANCE_CONTRIBUTION','SEVERANCE_PENALTY',
    'BENEFIT_OVERPAYMENT','BENEFIT_APPEAL',
    'ESTATE_RECOVERY','ELIGIBILITY_DISPUTE',
    'PAYMENT_AFTER_DEATH','FRAUD_REVIEW',
    'CONTRIBUTION_RECOVERY','BENEFIT_DISPUTE','OVERPAYMENT_RECOVERY',
    'APPEAL','FINANCE_RECOVERY','GENERIC','GEN_PENALTY','GEN_CONTRIBUTION'
  ));

ALTER TABLE public.lg_case_action DROP CONSTRAINT IF EXISTS lg_case_action_liability_head_code_check;
ALTER TABLE public.lg_case_action ADD CONSTRAINT lg_case_action_liability_head_code_check
  CHECK (liability_head_code IS NULL OR liability_head_code IN (
    'SS_CONTRIBUTION','SS_PENALTY',
    'LV_CONTRIBUTION','LV_PENALTY',
    'PE_CONTRIBUTION','PE_PENALTY',
    'HSD_LEVY_CONTRIBUTION','HSD_LEVY_PENALTY',
    'SEVERANCE_CONTRIBUTION','SEVERANCE_PENALTY',
    'COURT_COST','LEGAL_FEE','PAYMENT_PLAN_INSTALLMENT'
  ));