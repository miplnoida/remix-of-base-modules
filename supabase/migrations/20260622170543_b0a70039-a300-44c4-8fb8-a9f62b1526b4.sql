
-- 1. Source master
CREATE TABLE IF NOT EXISTS public.lg_case_source_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL DEFAULT 'SKN',
  source_code TEXT NOT NULL,
  source_name TEXT NOT NULL,
  description TEXT,
  default_workbasket_code TEXT,
  default_team_code TEXT,
  default_stage_code TEXT,
  allow_manual_entry BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  UNIQUE (country_code, source_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_case_source_config TO authenticated, anon;
GRANT ALL ON public.lg_case_source_config TO service_role;

-- 2. Allowed case types per source
CREATE TABLE IF NOT EXISTS public.lg_case_source_case_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL DEFAULT 'SKN',
  source_code TEXT NOT NULL,
  case_type_code TEXT NOT NULL,
  default_stage_code TEXT,
  default_workbasket_code TEXT,
  default_team_code TEXT,
  priority_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  UNIQUE (country_code, source_code, case_type_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_case_source_case_type TO authenticated, anon;
GRANT ALL ON public.lg_case_source_case_type TO service_role;

-- 3. Allowed stages per source
CREATE TABLE IF NOT EXISTS public.lg_case_source_stage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL DEFAULT 'SKN',
  source_code TEXT NOT NULL,
  stage_code TEXT NOT NULL,
  allowed_as_initial_stage BOOLEAN NOT NULL DEFAULT TRUE,
  allowed_as_transition_stage BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  UNIQUE (country_code, source_code, stage_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_case_source_stage TO authenticated, anon;
GRANT ALL ON public.lg_case_source_stage TO service_role;

-- Touch triggers
CREATE OR REPLACE FUNCTION public.lg_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_lg_case_source_config_touch ON public.lg_case_source_config;
CREATE TRIGGER trg_lg_case_source_config_touch BEFORE UPDATE ON public.lg_case_source_config
FOR EACH ROW EXECUTE FUNCTION public.lg_touch_updated_at();

DROP TRIGGER IF EXISTS trg_lg_case_source_case_type_touch ON public.lg_case_source_case_type;
CREATE TRIGGER trg_lg_case_source_case_type_touch BEFORE UPDATE ON public.lg_case_source_case_type
FOR EACH ROW EXECUTE FUNCTION public.lg_touch_updated_at();

DROP TRIGGER IF EXISTS trg_lg_case_source_stage_touch ON public.lg_case_source_stage;
CREATE TRIGGER trg_lg_case_source_stage_touch BEFORE UPDATE ON public.lg_case_source_stage
FOR EACH ROW EXECUTE FUNCTION public.lg_touch_updated_at();

-- Seed sources (idempotent)
INSERT INTO public.lg_case_source_config
  (country_code, source_code, source_name, description, default_workbasket_code, default_team_code, default_stage_code, allow_manual_entry, display_order)
VALUES
  ('SKN', 'COMPLIANCE_REFERRAL', 'Compliance Referral', 'Cases forwarded from the Compliance module.', 'LEGAL_INTAKE_REVIEW', 'GENERAL_LEGAL', 'REFERRAL_RECEIVED', FALSE, 10),
  ('SKN', 'MANUAL_EMPLOYER',     'Manual Employer Case', 'Started directly in Legal against an employer.', 'LEGAL_INTAKE_REVIEW', 'GENERAL_LEGAL', 'LEGAL_REVIEW', TRUE, 20),
  ('SKN', 'MANUAL_MEMBER',       'Manual Insured Person Case', 'Started directly in Legal against an insured person.', 'LEGAL_INTAKE_REVIEW', 'GENERAL_LEGAL', 'LEGAL_REVIEW', TRUE, 30),
  ('SKN', 'LEGACY',              'Legacy Case', 'Historical cases entered from outside the system.', 'LEGAL_INTAKE_REVIEW', 'GENERAL_LEGAL', 'LEGAL_REVIEW', TRUE, 40),
  ('SKN', 'COURT_FILED',         'Court Case Already Filed', 'Captured after a case has been filed in court.', 'LEGAL_COURT_FILING', 'GENERAL_LEGAL', 'COURT_FILING', TRUE, 50),
  ('SKN', 'INTERNAL',            'Internal / Legal Advisory', 'Internal legal opinion or advisory work.', 'LEGAL_INTAKE_REVIEW', 'GENERAL_LEGAL', 'LEGAL_REVIEW', TRUE, 60)
ON CONFLICT (country_code, source_code) DO NOTHING;

-- Seed allowed case types
INSERT INTO public.lg_case_source_case_type (country_code, source_code, case_type_code) VALUES
  ('SKN','COMPLIANCE_REFERRAL','CONTRIBUTION_RECOVERY'),
  ('SKN','COMPLIANCE_REFERRAL','FAILURE_TO_REGISTER'),
  ('SKN','COMPLIANCE_REFERRAL','FAILURE_TO_REMIT'),
  ('SKN','COMPLIANCE_REFERRAL','PAYMENT_ARRANGEMENT_DEFAULT'),
  ('SKN','COMPLIANCE_REFERRAL','PENALTY_RECOVERY'),
  ('SKN','MANUAL_EMPLOYER','CONTRIBUTION_RECOVERY'),
  ('SKN','MANUAL_EMPLOYER','FAILURE_TO_REGISTER'),
  ('SKN','MANUAL_EMPLOYER','FAILURE_TO_REMIT'),
  ('SKN','MANUAL_EMPLOYER','PAYMENT_ARRANGEMENT_DEFAULT'),
  ('SKN','MANUAL_EMPLOYER','LEGAL_ADVICE'),
  ('SKN','MANUAL_EMPLOYER','CONTRACT_REVIEW'),
  ('SKN','MANUAL_MEMBER','BENEFIT_APPEAL'),
  ('SKN','MANUAL_MEMBER','OVERPAYMENT_RECOVERY'),
  ('SKN','MANUAL_MEMBER','FRAUD_MISREPRESENTATION'),
  ('SKN','MANUAL_MEMBER','ESTATE_RECOVERY'),
  ('SKN','MANUAL_MEMBER','BENEFIT_DISPUTE'),
  ('SKN','LEGACY','CONTRIBUTION_RECOVERY'),
  ('SKN','LEGACY','FAILURE_TO_REGISTER'),
  ('SKN','LEGACY','FAILURE_TO_REMIT'),
  ('SKN','LEGACY','PAYMENT_ARRANGEMENT_DEFAULT'),
  ('SKN','LEGACY','BENEFIT_APPEAL'),
  ('SKN','LEGACY','OVERPAYMENT_RECOVERY'),
  ('SKN','LEGACY','FRAUD_MISREPRESENTATION'),
  ('SKN','LEGACY','ESTATE_RECOVERY'),
  ('SKN','LEGACY','PENALTY_RECOVERY'),
  ('SKN','LEGACY','BENEFIT_DISPUTE'),
  ('SKN','LEGACY','LEGAL_ADVICE'),
  ('SKN','LEGACY','CONTRACT_REVIEW'),
  ('SKN','COURT_FILED','CONTRIBUTION_RECOVERY'),
  ('SKN','COURT_FILED','FRAUD_MISREPRESENTATION'),
  ('SKN','COURT_FILED','OVERPAYMENT_RECOVERY'),
  ('SKN','INTERNAL','LEGAL_ADVICE'),
  ('SKN','INTERNAL','CONTRACT_REVIEW')
ON CONFLICT (country_code, source_code, case_type_code) DO NOTHING;

-- Seed allowed stages
INSERT INTO public.lg_case_source_stage (country_code, source_code, stage_code, allowed_as_initial_stage, allowed_as_transition_stage) VALUES
  ('SKN','COMPLIANCE_REFERRAL','REFERRAL_RECEIVED', TRUE,  TRUE),
  ('SKN','COMPLIANCE_REFERRAL','LEGAL_REVIEW',      TRUE,  TRUE),
  ('SKN','COMPLIANCE_REFERRAL','DEMAND_NOTICE',     FALSE, TRUE),
  ('SKN','COMPLIANCE_REFERRAL','SETTLEMENT_NEGOTIATION', FALSE, TRUE),
  ('SKN','COMPLIANCE_REFERRAL','COURT_FILING',      FALSE, TRUE),
  ('SKN','COMPLIANCE_REFERRAL','HEARING',           FALSE, TRUE),
  ('SKN','COMPLIANCE_REFERRAL','JUDGMENT',          FALSE, TRUE),
  ('SKN','COMPLIANCE_REFERRAL','ENFORCEMENT',       FALSE, TRUE),
  ('SKN','COMPLIANCE_REFERRAL','CLOSED',            FALSE, TRUE),
  ('SKN','MANUAL_EMPLOYER','LEGAL_REVIEW',          TRUE,  TRUE),
  ('SKN','MANUAL_EMPLOYER','DEMAND_NOTICE',         TRUE,  TRUE),
  ('SKN','MANUAL_EMPLOYER','SETTLEMENT_NEGOTIATION', FALSE, TRUE),
  ('SKN','MANUAL_EMPLOYER','COURT_FILING',          FALSE, TRUE),
  ('SKN','MANUAL_EMPLOYER','HEARING',               FALSE, TRUE),
  ('SKN','MANUAL_EMPLOYER','JUDGMENT',              FALSE, TRUE),
  ('SKN','MANUAL_EMPLOYER','ENFORCEMENT',           FALSE, TRUE),
  ('SKN','MANUAL_EMPLOYER','CLOSED',                FALSE, TRUE),
  ('SKN','MANUAL_MEMBER','LEGAL_REVIEW',            TRUE,  TRUE),
  ('SKN','MANUAL_MEMBER','DEMAND_NOTICE',           FALSE, TRUE),
  ('SKN','MANUAL_MEMBER','SETTLEMENT_NEGOTIATION',  FALSE, TRUE),
  ('SKN','MANUAL_MEMBER','COURT_FILING',            FALSE, TRUE),
  ('SKN','MANUAL_MEMBER','HEARING',                 FALSE, TRUE),
  ('SKN','MANUAL_MEMBER','JUDGMENT',                FALSE, TRUE),
  ('SKN','MANUAL_MEMBER','ENFORCEMENT',             FALSE, TRUE),
  ('SKN','MANUAL_MEMBER','CLOSED',                  FALSE, TRUE),
  ('SKN','LEGACY','REFERRAL_RECEIVED',              TRUE,  TRUE),
  ('SKN','LEGACY','LEGAL_REVIEW',                   TRUE,  TRUE),
  ('SKN','LEGACY','DEMAND_NOTICE',                  TRUE,  TRUE),
  ('SKN','LEGACY','SETTLEMENT_NEGOTIATION',         TRUE,  TRUE),
  ('SKN','LEGACY','COURT_FILING',                   TRUE,  TRUE),
  ('SKN','LEGACY','HEARING',                        TRUE,  TRUE),
  ('SKN','LEGACY','JUDGMENT',                       TRUE,  TRUE),
  ('SKN','LEGACY','ENFORCEMENT',                    TRUE,  TRUE),
  ('SKN','LEGACY','CLOSED',                         TRUE,  TRUE),
  ('SKN','COURT_FILED','COURT_FILING',              TRUE,  TRUE),
  ('SKN','COURT_FILED','HEARING',                   TRUE,  TRUE),
  ('SKN','COURT_FILED','JUDGMENT',                  FALSE, TRUE),
  ('SKN','COURT_FILED','ENFORCEMENT',               FALSE, TRUE),
  ('SKN','COURT_FILED','CLOSED',                    FALSE, TRUE),
  ('SKN','INTERNAL','LEGAL_REVIEW',                 TRUE,  TRUE),
  ('SKN','INTERNAL','CLOSED',                       FALSE, TRUE)
ON CONFLICT (country_code, source_code, stage_code) DO NOTHING;
