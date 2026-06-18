
ALTER TABLE public.bn_country_participant_type
  ALTER COLUMN participant_role TYPE VARCHAR(40),
  ALTER COLUMN type_code TYPE VARCHAR(50);

ALTER TABLE public.bn_country_participant_type
  ADD COLUMN IF NOT EXISTS role_category TEXT,
  ADD COLUMN IF NOT EXISTS can_register_online BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_be_added_by_claimant BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_email_verification BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_phone_verification BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_ssn_link BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.bn_country_participant_type
  DROP CONSTRAINT IF EXISTS bn_cpt_role_category_chk;
ALTER TABLE public.bn_country_participant_type
  ADD CONSTRAINT bn_cpt_role_category_chk
  CHECK (role_category IS NULL OR role_category IN ('CLAIMANT','INSURED','BENEFICIARY','EMPLOYER','PROVIDER','OFFICER','THIRD_PARTY'));

CREATE TABLE IF NOT EXISTS public.bn_participant_proof_requirement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(5) NOT NULL REFERENCES public.bn_country(country_code),
  proof_requirement_code TEXT NOT NULL,
  proof_requirement_name TEXT NOT NULL,
  proof_category TEXT NOT NULL CHECK (proof_category IN ('IDENTITY','RELATIONSHIP','AUTHORITY','EMPLOYMENT','MEDICAL','PAYMENT')),
  suggested_document_label TEXT,
  document_type_id UUID,
  service_document_type_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  entered_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, proof_requirement_code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_participant_proof_requirement TO authenticated;
GRANT ALL ON public.bn_participant_proof_requirement TO service_role;
-- NO-RLS architecture: intentionally not enabling RLS (app-layer enforcement).

CREATE INDEX IF NOT EXISTS idx_bn_proof_req_country ON public.bn_participant_proof_requirement(country_code);

INSERT INTO public.bn_participant_proof_requirement
  (country_code, proof_requirement_code, proof_requirement_name, proof_category, suggested_document_label, sort_order)
VALUES
  ('SKN','IDENTITY_VERIFICATION','Identity Verification','IDENTITY','National ID / Passport / SSN verification',10),
  ('SKN','IDENTITY_SSN_MATCH','SSN Identity Match','IDENTITY','SSN, Date of Birth and Name match',20),
  ('SKN','DEATH_VERIFICATION','Death Verification','IDENTITY','Death Certificate',30),
  ('SKN','SPOUSE_RELATIONSHIP','Spouse Relationship','RELATIONSHIP','Marriage Certificate',40),
  ('SKN','CHILD_RELATIONSHIP','Child Relationship','RELATIONSHIP','Birth Certificate',50),
  ('SKN','DEPENDENCY_PROOF','Dependency Proof','RELATIONSHIP','Dependency declaration / supporting proof',60),
  ('SKN','GUARDIAN_AUTHORITY','Guardian Authority','AUTHORITY','Guardianship order / legal authority',70),
  ('SKN','EMPLOYER_ACCOUNT_VALIDATION','Employer Account Validation','EMPLOYMENT','Employer registration / employer account validation',80),
  ('SKN','PROVIDER_REGISTRATION','Provider Registration','AUTHORITY','Provider registration / licence',90),
  ('SKN','DOCTOR_REGISTRATION','Doctor Registration','AUTHORITY','Medical registration / licence',100),
  ('SKN','FUNERAL_RESPONSIBILITY','Funeral Responsibility','AUTHORITY','Funeral invoice / receipt / authorization',110),
  ('SKN','ESTATE_AUTHORITY','Estate Authority','AUTHORITY','Probate / letter of administration',120),
  ('SKN','PAYEE_AUTHORITY','Payee Authority','PAYMENT','Payee authorization',130)
ON CONFLICT (country_code, proof_requirement_code) DO UPDATE SET
  proof_requirement_name = EXCLUDED.proof_requirement_name,
  proof_category = EXCLUDED.proof_category,
  suggested_document_label = EXCLUDED.suggested_document_label,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

INSERT INTO public.bn_country_participant_type (
  country_code, type_code, type_name, participant_role, role_category,
  requires_identity_verification, requires_relationship_or_authority_proof,
  requires_ssn_link, requires_officer_review,
  can_register_online, can_apply_for_self, can_apply_for_others, can_be_added_by_claimant,
  can_receive_communication, can_receive_payment,
  proof_requirement_code, requires_id, requires_relationship_proof, sort_order, is_active
) VALUES
  ('SKN','INSURED_PERSON','Insured Person','INSURED_PERSON','INSURED',
    true,false,true,false, true,true,false,false, true,true,
    'IDENTITY_SSN_MATCH', true,false,10,true),
  ('SKN','CLAIMANT','Claimant','CLAIMANT','CLAIMANT',
    true,false,false,false, true,true,true,false, true,true,
    'IDENTITY_VERIFICATION', true,false,20,true),
  ('SKN','DECEASED_INSURED_PERSON','Deceased Insured Person','DECEASED_INSURED_PERSON','INSURED',
    true,false,true,false, false,false,false,false, false,false,
    'DEATH_VERIFICATION', true,false,30,true),
  ('SKN','SPOUSE','Spouse','BENEFICIARY','BENEFICIARY',
    true,true,false,false, false,false,false,true, true,true,
    'SPOUSE_RELATIONSHIP', true,true,40,true),
  ('SKN','CHILD','Child','BENEFICIARY','BENEFICIARY',
    true,true,false,false, false,false,false,true, false,false,
    'CHILD_RELATIONSHIP', true,true,50,true),
  ('SKN','DEPENDENT','Dependent','BENEFICIARY','BENEFICIARY',
    true,true,false,false, false,false,false,true, false,false,
    'DEPENDENCY_PROOF', true,true,60,true),
  ('SKN','GUARDIAN','Guardian','GUARDIAN','THIRD_PARTY',
    true,true,false,true, false,false,true,false, true,true,
    'GUARDIAN_AUTHORITY', true,true,70,true),
  ('SKN','EMPLOYER','Employer','EMPLOYER','EMPLOYER',
    false,true,false,false, true,false,false,false, true,false,
    'EMPLOYER_ACCOUNT_VALIDATION', false,true,80,true),
  ('SKN','MEDICAL_PROVIDER','Medical Provider','MEDICAL_PROVIDER','PROVIDER',
    false,true,false,false, true,false,false,false, true,true,
    'PROVIDER_REGISTRATION', false,true,90,true),
  ('SKN','DOCTOR','Doctor','DOCTOR','PROVIDER',
    false,true,false,false, true,false,false,false, true,false,
    'DOCTOR_REGISTRATION', false,true,100,true),
  ('SKN','FUNERAL_ARRANGER','Funeral Arranger','FUNERAL_HOME','THIRD_PARTY',
    true,true,false,false, false,false,false,true, true,true,
    'FUNERAL_RESPONSIBILITY', true,true,110,true),
  ('SKN','EXECUTOR_OR_ESTATE','Executor / Estate','REPRESENTATIVE','THIRD_PARTY',
    true,true,false,true, false,false,true,false, true,true,
    'ESTATE_AUTHORITY', true,true,120,true),
  ('SKN','PAYEE','Payee','PAYEE','THIRD_PARTY',
    true,true,false,true, false,false,false,false, true,true,
    'PAYEE_AUTHORITY', true,true,130,true)
ON CONFLICT (country_code, type_code) DO UPDATE SET
  type_name = EXCLUDED.type_name,
  participant_role = EXCLUDED.participant_role,
  role_category = EXCLUDED.role_category,
  requires_identity_verification = EXCLUDED.requires_identity_verification,
  requires_relationship_or_authority_proof = EXCLUDED.requires_relationship_or_authority_proof,
  requires_ssn_link = EXCLUDED.requires_ssn_link,
  requires_officer_review = EXCLUDED.requires_officer_review,
  can_register_online = EXCLUDED.can_register_online,
  can_apply_for_self = EXCLUDED.can_apply_for_self,
  can_apply_for_others = EXCLUDED.can_apply_for_others,
  can_be_added_by_claimant = EXCLUDED.can_be_added_by_claimant,
  can_receive_communication = EXCLUDED.can_receive_communication,
  can_receive_payment = EXCLUDED.can_receive_payment,
  proof_requirement_code = EXCLUDED.proof_requirement_code,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;
