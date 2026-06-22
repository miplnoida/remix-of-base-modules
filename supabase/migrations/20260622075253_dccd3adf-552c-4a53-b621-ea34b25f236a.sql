
-- Legacy and source-mode fields for lg_case
ALTER TABLE public.lg_case
  ADD COLUMN IF NOT EXISTS source_mode varchar(40),
  ADD COLUMN IF NOT EXISTS case_source_code varchar(40),
  ADD COLUMN IF NOT EXISTS legacy_case_no text,
  ADD COLUMN IF NOT EXISTS legacy_employer_name text,
  ADD COLUMN IF NOT EXISTS legacy_person_name text,
  ADD COLUMN IF NOT EXISTS legacy_court_case_no text,
  ADD COLUMN IF NOT EXISTS legacy_opened_date date,
  ADD COLUMN IF NOT EXISTS legacy_notes text,
  ADD COLUMN IF NOT EXISTS is_legacy boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_lg_case_source_mode ON public.lg_case(source_mode);
CREATE INDEX IF NOT EXISTS idx_lg_case_is_legacy ON public.lg_case(is_legacy) WHERE is_legacy = true;

-- New reference groups (LG_CASE_CATEGORY, LG_CASE_SOURCE_MODE)
INSERT INTO public.core_reference_group (id, group_code, group_name, module_code, description, is_active, is_system, sort_order)
SELECT gen_random_uuid(), v.code, v.name, 'LEGAL', v.descr, true, false, v.so
FROM (VALUES
  ('LG_CASE_CATEGORY', 'Legal Case Category', 'Top-level category bucket for legal cases', 70),
  ('LG_CASE_SOURCE_MODE', 'Legal Case Source Mode', 'How a legal case originated (compliance referral, manual, legacy, etc.)', 75)
) AS v(code, name, descr, so)
WHERE NOT EXISTS (SELECT 1 FROM public.core_reference_group g WHERE g.group_code = v.code AND g.module_code = 'LEGAL');

-- Seed LG_CASE_CATEGORY values
WITH g AS (SELECT id FROM public.core_reference_group WHERE group_code='LG_CASE_CATEGORY' AND module_code='LEGAL')
INSERT INTO public.core_reference_value (id, group_id, value_code, value_label, sort_order, is_active, status, module_code)
SELECT gen_random_uuid(), g.id, v.c, v.l, v.so, true, 'ACTIVE', 'LEGAL'
FROM g, (VALUES
  ('EMPLOYER',10,'Employer'),
  ('INSURED_MEMBER',20,'Insured / Member'),
  ('INTERNAL_LEGAL',30,'Internal / Legal Advisory'),
  ('OTHER',90,'Other')
) AS v(c, so, l)
WHERE NOT EXISTS (
  SELECT 1 FROM public.core_reference_value rv WHERE rv.group_id = g.id AND rv.value_code = v.c
);

-- Seed LG_CASE_SOURCE_MODE values
WITH g AS (SELECT id FROM public.core_reference_group WHERE group_code='LG_CASE_SOURCE_MODE' AND module_code='LEGAL')
INSERT INTO public.core_reference_value (id, group_id, value_code, value_label, sort_order, is_active, status, module_code)
SELECT gen_random_uuid(), g.id, v.c, v.l, v.so, true, 'ACTIVE', 'LEGAL'
FROM g, (VALUES
  ('COMPLIANCE_REFERRAL',10,'From Compliance Referral'),
  ('MANUAL_EMPLOYER',20,'Manual Employer Case'),
  ('MANUAL_MEMBER',30,'Manual Insured / Member Case'),
  ('LEGACY',40,'Legacy Case Entry'),
  ('COURT_FILED',50,'Court Case Already Filed'),
  ('INTERNAL',60,'Internal / Legal Advisory')
) AS v(c, so, l)
WHERE NOT EXISTS (
  SELECT 1 FROM public.core_reference_value rv WHERE rv.group_id = g.id AND rv.value_code = v.c
);

-- Extend LG_CASE_TYPE with the SSB-specific codes
WITH g AS (SELECT id FROM public.core_reference_group WHERE group_code='LG_CASE_TYPE' AND module_code='LEGAL')
INSERT INTO public.core_reference_value (id, group_id, value_code, value_label, sort_order, is_active, status, module_code)
SELECT gen_random_uuid(), g.id, v.c, v.l, v.so, true, 'ACTIVE', 'LEGAL'
FROM g, (VALUES
  ('CONTRIBUTION_RECOVERY',100,'Contribution Recovery'),
  ('FAILURE_TO_REGISTER',110,'Failure to Register'),
  ('FAILURE_TO_REMIT',120,'Failure to Remit'),
  ('LATE_PAYMENT',130,'Late Payment'),
  ('PENALTY_RECOVERY',140,'Penalty Recovery'),
  ('PAYMENT_ARRANGEMENT_DEFAULT',150,'Payment Arrangement Default'),
  ('JUDGMENT_ENFORCEMENT',160,'Judgment Enforcement'),
  ('BENEFIT_APPEAL',200,'Benefit Appeal'),
  ('OVERPAYMENT_RECOVERY',210,'Overpayment Recovery'),
  ('FRAUD_MISREPRESENTATION',220,'Fraud / Misrepresentation'),
  ('ESTATE_RECOVERY',230,'Estate Recovery'),
  ('LEGAL_ADVICE',300,'Legal Advice'),
  ('POLICY_INTERPRETATION',310,'Policy Interpretation'),
  ('CONTRACT_REVIEW',320,'Contract Review'),
  ('COURT_ORDER_RESPONSE',330,'Court Order Response')
) AS v(c, so, l)
WHERE NOT EXISTS (
  SELECT 1 FROM public.core_reference_value rv WHERE rv.group_id = g.id AND rv.value_code = v.c
);

-- Extend LG_PARTY_ROLE
WITH g AS (SELECT id FROM public.core_reference_group WHERE group_code='LG_PARTY_ROLE' AND module_code='LEGAL')
INSERT INTO public.core_reference_value (id, group_id, value_code, value_label, sort_order, is_active, status, module_code)
SELECT gen_random_uuid(), g.id, v.c, v.l, v.so, true, 'ACTIVE', 'LEGAL'
FROM g, (VALUES
  ('COMPLAINANT',5,'Complainant'),
  ('EMPLOYER',80,'Employer'),
  ('INSURED_PERSON',90,'Insured Person'),
  ('BENEFICIARY',100,'Beneficiary'),
  ('CLAIMANT',110,'Claimant'),
  ('DIRECTOR',120,'Director'),
  ('OFFICER',130,'Officer'),
  ('REPRESENTATIVE',140,'Representative'),
  ('ATTORNEY',150,'Attorney'),
  ('COURT',160,'Court'),
  ('PAYEE',170,'Payee'),
  ('ESTATE',180,'Estate'),
  ('GUARDIAN',190,'Guardian'),
  ('MEDICAL_PROVIDER',200,'Medical Provider'),
  ('OTHER',900,'Other')
) AS v(c, so, l)
WHERE NOT EXISTS (
  SELECT 1 FROM public.core_reference_value rv WHERE rv.group_id = g.id AND rv.value_code = v.c
);

-- Extend LG_PARTY_TYPE
WITH g AS (SELECT id FROM public.core_reference_group WHERE group_code='LG_PARTY_TYPE' AND module_code='LEGAL')
INSERT INTO public.core_reference_value (id, group_id, value_code, value_label, sort_order, is_active, status, module_code)
SELECT gen_random_uuid(), g.id, v.c, v.l, v.so, true, 'ACTIVE', 'LEGAL'
FROM g, (VALUES
  ('PERSON',15,'Person'),
  ('BENEFICIARY',35,'Beneficiary'),
  ('ORGANISATION',70,'Organisation'),
  ('COURT',80,'Court'),
  ('LEGAL_REPRESENTATIVE',90,'Legal Representative'),
  ('INTERNAL_DEPARTMENT',100,'Internal Department'),
  ('THIRD_PARTY',110,'Third Party')
) AS v(c, so, l)
WHERE NOT EXISTS (
  SELECT 1 FROM public.core_reference_value rv WHERE rv.group_id = g.id AND rv.value_code = v.c
);
