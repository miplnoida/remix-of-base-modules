
ALTER TABLE public.lg_case
  ADD COLUMN IF NOT EXISTS respondent_kind varchar(20);

ALTER TABLE public.lg_case_action
  ADD COLUMN IF NOT EXISTS catalog_code varchar(60),
  ADD COLUMN IF NOT EXISTS category    varchar(40);

CREATE INDEX IF NOT EXISTS idx_lg_case_action_catalog_code ON public.lg_case_action(catalog_code);
CREATE INDEX IF NOT EXISTS idx_lg_case_respondent_kind   ON public.lg_case(respondent_kind);

CREATE TABLE IF NOT EXISTS public.lg_case_action_catalog (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_mode     varchar(40) NOT NULL,
  party_kind      varchar(20) NOT NULL,
  action_code     varchar(60) NOT NULL,
  action_label    varchar(160) NOT NULL,
  action_kind     varchar(20) NOT NULL,
  category        varchar(40) NOT NULL,
  description     text,
  requires_period boolean NOT NULL DEFAULT false,
  requires_amount boolean NOT NULL DEFAULT false,
  requires_court_ref boolean NOT NULL DEFAULT false,
  default_owner_role varchar(60),
  display_order   int NOT NULL DEFAULT 100,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lg_case_action_catalog_uq UNIQUE (source_mode, action_code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_case_action_catalog TO authenticated;
GRANT ALL ON public.lg_case_action_catalog TO service_role;

CREATE INDEX IF NOT EXISTS idx_lg_action_catalog_src   ON public.lg_case_action_catalog(source_mode, is_active);
CREATE INDEX IF NOT EXISTS idx_lg_action_catalog_party ON public.lg_case_action_catalog(party_kind, is_active);

-- Seed: Employer-side financial / enforcement heads
INSERT INTO public.lg_case_action_catalog
  (source_mode, party_kind, action_code, action_label, action_kind, category, description,
   requires_period, requires_amount, requires_court_ref, display_order)
VALUES
  ('ANY','EMPLOYER','SS_CONTRIBUTION',        'SS Contribution Arrears',         'LIABILITY','FINANCIAL','Outstanding Social Security contributions', true, true, false, 10),
  ('ANY','EMPLOYER','SS_PENALTY',             'SS Penalty',                       'LIABILITY','FINANCIAL','Penalty on SS contribution arrears',         true, true, false, 11),
  ('ANY','EMPLOYER','SS_INTEREST',            'SS Interest',                      'LIABILITY','FINANCIAL','Interest accrued on SS arrears',             true, true, false, 12),
  ('ANY','EMPLOYER','HSD_LEVY_CONTRIBUTION',  'HSD Levy',                         'LIABILITY','FINANCIAL','Housing/Severance/Development levy arrears', true, true, false, 20),
  ('ANY','EMPLOYER','HSD_LEVY_PENALTY',       'HSD Levy Penalty',                 'LIABILITY','FINANCIAL','Penalty on HSD levy arrears',                true, true, false, 21),
  ('ANY','EMPLOYER','SEVERANCE_CONTRIBUTION', 'Severance Fund Contribution',      'LIABILITY','FINANCIAL','Severance fund contribution arrears',        true, true, false, 30),
  ('ANY','EMPLOYER','SEVERANCE_PENALTY',      'Severance Fund Penalty',           'LIABILITY','FINANCIAL','Penalty on severance fund arrears',          true, true, false, 31),
  ('ANY','EMPLOYER','EI_LEVY',                'Employment Injury Levy',           'LIABILITY','FINANCIAL','EI levy arrears',                            true, true, false, 40),
  ('ANY','EMPLOYER','RETURNS_NON_FILING',     'Non-Filing of Monthly Returns',    'LIABILITY','ENFORCEMENT','Failure to submit monthly returns (C3)',    true, false, false, 50),
  ('ANY','EMPLOYER','REGISTRATION_DEFAULT',   'Failure to Register Employees',    'LIABILITY','ENFORCEMENT','Employees not registered with SSB',         false, false, false, 51),
  ('ANY','EMPLOYER','RECORDS_INSPECTION_REFUSAL','Obstruction of Inspector',       'LIABILITY','ENFORCEMENT','Refusal to produce records / obstruction',  false, false, false, 52),
  ('ANY','EMPLOYER','COURT_RECOVERY_ACTION',  'Civil Recovery Suit',              'COURT',    'COURT',     'Civil suit for combined dues',              false, true, true, 60),
  ('ANY','EMPLOYER','CRIMINAL_PROSECUTION',   'Criminal Prosecution',             'COURT',    'COURT',     'Criminal prosecution where statute allows', false, false, true, 61),
  ('ANY','EMPLOYER','COURT_COST',             'Court Costs',                      'LIABILITY','FINANCIAL','Costs awarded by court',                    false, true, false, 70),
  ('ANY','EMPLOYER','LEGAL_FEE',              'Legal Fees',                       'LIABILITY','FINANCIAL','Internal/external legal fees',              false, true, false, 71)
ON CONFLICT (source_mode, action_code) DO NOTHING;

-- Seed: Insured-person actions
INSERT INTO public.lg_case_action_catalog
  (source_mode, party_kind, action_code, action_label, action_kind, category, description,
   requires_period, requires_amount, requires_court_ref, display_order)
VALUES
  ('ANY','INSURED','BENEFIT_OVERPAYMENT_RECOVERY','Benefit Overpayment Recovery','BENEFIT','RECOVERY',  'Recover overpaid benefit (Sickness/Maternity/Invalidity/Pension/Funeral)', false, true, false, 10),
  ('ANY','INSURED','BENEFIT_DENIAL_APPEAL',       'Benefit Denial Appeal',       'BENEFIT','APPEAL',    'Member appeals denied benefit claim',                                       false, false, false, 11),
  ('ANY','INSURED','ELIGIBILITY_DISPUTE',         'Eligibility Dispute',         'BENEFIT','APPEAL',    'Dispute over contributory eligibility',                                     false, false, false, 12),
  ('ANY','INSURED','BENEFIT_FRAUD_REVIEW',        'Benefit Fraud Review',        'BENEFIT','ENFORCEMENT','Suspected fraudulent benefit claim',                                       false, false, false, 13),
  ('ANY','INSURED','MEDICAL_BOARD_REFERRAL',      'Medical Board Referral',      'BENEFIT','APPEAL',    'Disability / Invalidity medical re-assessment',                             false, false, false, 14),
  ('ANY','INSURED','ESTATE_RECOVERY',             'Estate Recovery',             'BENEFIT','RECOVERY',  'Recovery from deceased member estate',                                      false, true, false, 15),
  ('ANY','INSURED','THIRD_PARTY_RECOVERY',        'Third-Party Recovery',        'BENEFIT','RECOVERY',  'Subrogation against tortfeasor (EI cases)',                                 false, true, false, 16),
  ('ANY','INSURED','TRIBUNAL_APPEAL',             'Tribunal Appeal',             'COURT',  'COURT',     'External tribunal escalation',                                              false, false, true, 17)
ON CONFLICT (source_mode, action_code) DO NOTHING;

-- Seed: Internal advisory
INSERT INTO public.lg_case_action_catalog
  (source_mode, party_kind, action_code, action_label, action_kind, category, description,
   requires_period, requires_amount, requires_court_ref, display_order)
VALUES
  ('INTERNAL','INTERNAL','LEGAL_OPINION',          'Legal Opinion',           'ADVISORY','ADVISORY','Written opinion on a question of law',     false,false,false,10),
  ('INTERNAL','INTERNAL','CONTRACT_REVIEW',        'Contract Review',         'ADVISORY','ADVISORY','Vendor / MoU / lease contract review',     false,false,false,11),
  ('INTERNAL','INTERNAL','POLICY_INTERPRETATION',  'Policy Interpretation',   'ADVISORY','ADVISORY','Interpretation of Act/Regulation',         false,false,false,12),
  ('INTERNAL','INTERNAL','LITIGATION_RISK_REVIEW', 'Litigation Risk Review',  'ADVISORY','ADVISORY','Pre-litigation risk note',                 false,false,false,13),
  ('INTERNAL','INTERNAL','REGULATORY_DRAFTING',    'Regulatory Drafting',     'ADVISORY','ADVISORY','Draft regulation / circular / guideline',  false,false,false,14)
ON CONFLICT (source_mode, action_code) DO NOTHING;
