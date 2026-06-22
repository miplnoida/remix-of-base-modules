
-- Extend routing policy with priority + escalation alias
ALTER TABLE public.lg_routing_policy
  ADD COLUMN IF NOT EXISTS default_priority_code TEXT,
  ADD COLUMN IF NOT EXISTS auto_assign_on_manual_case BOOLEAN;

-- Sync legacy column name → new flag (keep both in sync going forward at app layer)
UPDATE public.lg_routing_policy
   SET auto_assign_on_manual_case = COALESCE(auto_assign_on_manual_case, auto_assign_on_manual);

-- Source routing: add priority + strategy
ALTER TABLE public.lg_routing_source_map
  ADD COLUMN IF NOT EXISTS priority_code TEXT,
  ADD COLUMN IF NOT EXISTS assignment_strategy TEXT;

-- Stage routing: add case_type + auto_assign
ALTER TABLE public.lg_routing_stage_override
  ADD COLUMN IF NOT EXISTS case_type_code TEXT,
  ADD COLUMN IF NOT EXISTS auto_assign BOOLEAN NOT NULL DEFAULT false;

-- Case type routing layer
CREATE TABLE IF NOT EXISTS public.lg_routing_case_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL DEFAULT 'SKN',
  case_type_code TEXT NOT NULL,
  workbasket_code TEXT,
  team_code TEXT,
  priority_code TEXT,
  assignment_strategy TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  UNIQUE (country_code, case_type_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_routing_case_type TO authenticated;
GRANT ALL ON public.lg_routing_case_type TO service_role;

DROP TRIGGER IF EXISTS trg_lg_routing_case_type_updated ON public.lg_routing_case_type;
CREATE TRIGGER trg_lg_routing_case_type_updated BEFORE UPDATE ON public.lg_routing_case_type
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Seed SKN defaults =====
UPDATE public.lg_routing_policy
   SET default_team_code        = COALESCE(default_team_code, 'GENERAL_LEGAL'),
       default_workbasket_code  = COALESCE(default_workbasket_code, 'LEGAL_INTAKE_REVIEW'),
       default_strategy_code    = COALESCE(default_strategy_code, 'BY_WORKLOAD'),
       default_priority_code    = COALESCE(default_priority_code, 'NORMAL'),
       escalation_workbasket_code = COALESCE(escalation_workbasket_code, 'LEGAL_MANAGER_REVIEW'),
       escalate_unassigned_after_days = COALESCE(escalate_unassigned_after_days, 2),
       auto_assign_on_referral  = true,
       auto_assign_on_manual    = COALESCE(auto_assign_on_manual, false),
       auto_assign_on_manual_case = COALESCE(auto_assign_on_manual_case, false),
       allow_manual_override    = true
 WHERE country_code = 'SKN';

-- Source routing seeds
INSERT INTO public.lg_routing_source_map (country_code, source_code, workbasket_code, team_code, is_active)
VALUES
  ('SKN','COMPLIANCE_REFERRAL','LEGAL_REFERRAL_REVIEW','GENERAL_LEGAL', true),
  ('SKN','MANUAL_EMPLOYER',    'LEGAL_INTAKE_REVIEW',  'GENERAL_LEGAL', true),
  ('SKN','MANUAL_IP',          'LEGAL_INTAKE_REVIEW',  'GENERAL_LEGAL', true),
  ('SKN','LEGACY',             'LEGAL_CASE_ASSIGNMENT','GENERAL_LEGAL', true)
ON CONFLICT (country_code, source_code) DO NOTHING;

-- Case type routing seeds
INSERT INTO public.lg_routing_case_type (country_code, case_type_code, workbasket_code, team_code, is_active)
VALUES
  ('SKN','CONTRIBUTION_RECOVERY',      'LEGAL_REFERRAL_REVIEW','GENERAL_LEGAL', true),
  ('SKN','FAILURE_TO_REGISTER',        'LEGAL_REFERRAL_REVIEW','GENERAL_LEGAL', true),
  ('SKN','FAILURE_TO_REMIT',           'LEGAL_REFERRAL_REVIEW','GENERAL_LEGAL', true),
  ('SKN','PAYMENT_ARRANGEMENT_DEFAULT','LEGAL_ENFORCEMENT',    'GENERAL_LEGAL', true),
  ('SKN','BENEFIT_APPEAL',             'LEGAL_REVIEW',         'GENERAL_LEGAL', true),
  ('SKN','OVERPAYMENT_RECOVERY',       'LEGAL_REVIEW',         'GENERAL_LEGAL', true),
  ('SKN','FRAUD_MISREPRESENTATION',    'LEGAL_MANAGER_REVIEW', 'GENERAL_LEGAL', true),
  ('SKN','ESTATE_RECOVERY',            'LEGAL_REVIEW',         'GENERAL_LEGAL', true)
ON CONFLICT (country_code, case_type_code) DO NOTHING;

-- Stage routing seeds
INSERT INTO public.lg_routing_stage_override (country_code, stage_code, workbasket_code, team_code, is_active)
VALUES
  ('SKN','REFERRAL_RECEIVED',     'LEGAL_REFERRAL_REVIEW',     'GENERAL_LEGAL', true),
  ('SKN','LEGAL_REVIEW',          'LEGAL_CASE_ASSIGNMENT',     'GENERAL_LEGAL', true),
  ('SKN','DEMAND_NOTICE',         'LEGAL_CASE_ASSIGNMENT',     'GENERAL_LEGAL', true),
  ('SKN','SETTLEMENT_NEGOTIATION','LEGAL_SETTLEMENT_REVIEW',   'GENERAL_LEGAL', true),
  ('SKN','COURT_FILING',          'LEGAL_COURT_FILING',        'GENERAL_LEGAL', true),
  ('SKN','HEARING',               'LEGAL_HEARING_PREPARATION', 'GENERAL_LEGAL', true),
  ('SKN','JUDGMENT',              'LEGAL_JUDGMENT',            'GENERAL_LEGAL', true),
  ('SKN','ENFORCEMENT',           'LEGAL_ENFORCEMENT',         'GENERAL_LEGAL', true),
  ('SKN','FEES_AND_WAIVERS',      'LEGAL_FEE_POSTING',         'GENERAL_LEGAL', true),
  ('SKN','CLOSED',                NULL,                        NULL,            false)
ON CONFLICT (country_code, stage_code) DO NOTHING;
