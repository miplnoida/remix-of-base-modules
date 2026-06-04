
-- Widen code columns to fit longer SKN doc type codes
ALTER TABLE public.bn_service_doc_type ALTER COLUMN type_code TYPE varchar(60);
ALTER TABLE public.bn_doc_requirement   ALTER COLUMN document_type_code TYPE varchar(60);

-- Add metadata columns
ALTER TABLE public.bn_doc_requirement
  ADD COLUMN IF NOT EXISTS source_note text NULL,
  ADD COLUMN IF NOT EXISTS verification_status varchar(30) NOT NULL DEFAULT 'NEEDS_REVIEW',
  ADD COLUMN IF NOT EXISTS applies_to_applicant_type varchar(50) NULL,
  ADD COLUMN IF NOT EXISTS upload_mode varchar(30) NOT NULL DEFAULT 'UPLOAD_OR_SCAN';

CREATE UNIQUE INDEX IF NOT EXISTS uq_bn_doc_req_version_doc_stage_channel
  ON public.bn_doc_requirement (product_version_id, document_type_code, stage, channel_code);

-- Seed document types
INSERT INTO public.bn_service_doc_type (type_code, type_name, category, country_code, description) VALUES
  ('CLAIM_FORM', 'Generic Claim Form', 'FORM', 'SKN', 'Generic benefit claim form'),
  ('SS_CARD', 'Social Security Card', 'IDENTITY', 'SKN', 'Social Security card / SSN card'),
  ('SICKNESS_INJURY_CLAIM_FORM', 'Sickness / Injury Claim Form', 'FORM', 'SKN', 'Social Security Sickness/Injury claim form'),
  ('MATERNITY_CLAIM_FORM', 'Maternity Claim Form', 'FORM', 'SKN', 'Maternity benefit / grant claim form'),
  ('MATERNITY_EXPECTED_CONFINEMENT_CERT', 'Expected Confinement Certificate', 'MEDICAL', 'SKN', 'Doctor certificate of expected confinement date'),
  ('MATERNITY_ACTUAL_CONFINEMENT_CERT', 'Actual Confinement Certificate', 'MEDICAL', 'SKN', 'Doctor certificate of actual confinement / live birth'),
  ('EMPLOYER_INJURY_REPORT', 'Employer Injury Report', 'EMPLOYER', 'SKN', 'Employer report of workplace injury'),
  ('FUNERAL_CLAIM_FORM', 'Funeral Grant Claim Form', 'FORM', 'SKN', 'Approved funeral grant claim form'),
  ('FUNERAL_INVOICE_RECEIPT', 'Funeral Invoice / Receipt', 'FINANCIAL', 'SKN', 'Invoice or receipt for funeral expenses'),
  ('MEDICAL_BOARD_REPORT', 'Medical Board Report', 'MEDICAL', 'SKN', 'Medical Board assessment report'),
  ('MEANS_TEST_REPORT', 'Means Test Report', 'ASSESSMENT', 'SKN', 'Means test assessment report'),
  ('RESIDENCY_PROOF', 'Proof of Residency', 'IDENTITY', 'SKN', 'Proof of residence in St. Kitts and Nevis'),
  ('INCOME_PROOF', 'Proof of Income', 'FINANCIAL', 'SKN', 'Proof of income / financial status'),
  ('DEPENDANT_PROOF', 'Dependant Proof', 'RELATION', 'SKN', 'Proof of dependant relationship'),
  ('PAYMENT_AUTHORIZATION', 'Payment Authorization', 'FINANCIAL', 'SKN', 'Authorization for payment routing'),
  ('MEDICAL_EXPENSE_RECEIPT', 'Medical Expense Receipt', 'FINANCIAL', 'SKN', 'Receipt for medical expenses incurred'),
  ('REPRESENTATIVE_AUTHORIZATION', 'Representative Authorization', 'AUTHORIZATION', 'SKN', 'Authorization for representative to act on applicant behalf'),
  ('APPLICANT_DECLARATION', 'Applicant Declaration', 'FORM', 'SKN', 'Signed declaration by applicant')
ON CONFLICT (type_code) DO NOTHING;

-- Seed requirements via temp staging
CREATE TEMP TABLE _seed_req (
  benefit_code text, document_type_code text, stage text, channel_code text,
  requirement_level text, blocks_submission boolean, blocks_decision boolean, blocks_payment boolean,
  public_visible boolean, internal_visible boolean, upload_mode text, verification_status text,
  condition_json jsonb, source_note text
) ON COMMIT DROP;

INSERT INTO _seed_req VALUES
('SKN-SICK','SICKNESS_INJURY_CLAIM_FORM','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','OFFICIAL_CONFIRMED','{}'::jsonb,'SSB SKN: claim form'),
('SKN-SICK','MEDICAL_CERT','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','OFFICIAL_CONFIRMED','{}'::jsonb,'SSB SKN: medical certificate within claim form'),
('SKN-SICK','EMPLOYER_CONF','EVIDENCE_REVIEW','OFFLINE','MANDATORY',false,true,false,false,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,'Employer confirmation of employment up to incapacity'),
('SKN-SICK','BANK_EFT','PAYMENT','OFFLINE','WAIVABLE',false,false,true,true,true,'UPLOAD_OR_SCAN','OPERATIONAL_ASSUMED','{}'::jsonb,'EFT details if direct deposit chosen'),
('SKN-SICK','SICKNESS_INJURY_CLAIM_FORM','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','OFFICIAL_CONFIRMED','{}'::jsonb,'SSB SKN: claim form'),
('SKN-SICK','MEDICAL_CERT','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','OFFICIAL_CONFIRMED','{}'::jsonb,'SSB SKN: medical certificate'),
('SKN-SICK','EMPLOYER_CONF','EVIDENCE_REVIEW','ONLINE','MANDATORY',false,true,false,false,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,'Employer confirmation'),
('SKN-SICK','BANK_EFT','PAYMENT','ONLINE','WAIVABLE',false,false,true,true,true,'UPLOAD_ONLY','OPERATIONAL_ASSUMED','{}'::jsonb,'EFT details'),
('SKN-MAT','MATERNITY_CLAIM_FORM','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','OFFICIAL_CONFIRMED','{}'::jsonb,'SSB SKN: maternity claim form'),
('SKN-MAT','MATERNITY_EXPECTED_CONFINEMENT_CERT','INTAKE','OFFLINE','CONDITIONAL',false,true,false,true,true,'UPLOAD_OR_SCAN','OFFICIAL_CONFIRMED','{"when":"claim_before_confinement"}'::jsonb,'Required when claim filed before confinement'),
('SKN-MAT','MATERNITY_ACTUAL_CONFINEMENT_CERT','INTAKE','OFFLINE','CONDITIONAL',false,true,false,true,true,'UPLOAD_OR_SCAN','OFFICIAL_CONFIRMED','{"when":"claim_after_confinement"}'::jsonb,'Required when claim filed after confinement'),
('SKN-MAT','MARRIAGE_CERT','INTAKE','OFFLINE','CONDITIONAL',false,true,false,true,true,'UPLOAD_OR_SCAN','OFFICIAL_CONFIRMED','{"when":"maternity_grant_based_on_husband_contributions"}'::jsonb,'Maternity grant on husband contributions'),
('SKN-MAT','EMPLOYER_CONF','EVIDENCE_REVIEW','OFFLINE','MANDATORY',false,true,false,false,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-MAT','BANK_EFT','PAYMENT','OFFLINE','WAIVABLE',false,false,true,true,true,'UPLOAD_OR_SCAN','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-MAT','MATERNITY_CLAIM_FORM','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','OFFICIAL_CONFIRMED','{}'::jsonb,NULL),
('SKN-MAT','MATERNITY_EXPECTED_CONFINEMENT_CERT','INTAKE','ONLINE','CONDITIONAL',true,true,false,true,true,'UPLOAD_ONLY','OFFICIAL_CONFIRMED','{"when":"claim_before_confinement"}'::jsonb,NULL),
('SKN-MAT','MATERNITY_ACTUAL_CONFINEMENT_CERT','INTAKE','ONLINE','CONDITIONAL',true,true,false,true,true,'UPLOAD_ONLY','OFFICIAL_CONFIRMED','{"when":"claim_after_confinement"}'::jsonb,NULL),
('SKN-MAT','MARRIAGE_CERT','INTAKE','ONLINE','CONDITIONAL',true,true,false,true,true,'UPLOAD_ONLY','OFFICIAL_CONFIRMED','{"when":"maternity_grant_based_on_husband_contributions"}'::jsonb,NULL),
('SKN-MAT','EMPLOYER_CONF','EVIDENCE_REVIEW','ONLINE','MANDATORY',false,true,false,false,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-MAT','BANK_EFT','PAYMENT','ONLINE','WAIVABLE',false,false,true,true,true,'UPLOAD_ONLY','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-FUN','FUNERAL_CLAIM_FORM','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','OFFICIAL_CONFIRMED','{}'::jsonb,'SSB SKN: funeral grant claim form'),
('SKN-FUN','DEATH_CERT','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','OFFICIAL_CONFIRMED','{}'::jsonb,NULL),
('SKN-FUN','FUNERAL_INVOICE_RECEIPT','INTAKE','OFFLINE','CONDITIONAL',false,true,false,true,true,'UPLOAD_OR_SCAN','OFFICIAL_CONFIRMED','{"when":"director_requires_or_claimant_paid_expenses"}'::jsonb,NULL),
('SKN-FUN','BIRTH_CERT','EVIDENCE_REVIEW','OFFLINE','CONDITIONAL',false,true,false,true,true,'UPLOAD_OR_SCAN','OFFICIAL_CONFIRMED','{"when":"needed_to_confirm_deceased_identity_or_child_age"}'::jsonb,NULL),
('SKN-FUN','MARRIAGE_CERT','EVIDENCE_REVIEW','OFFLINE','CONDITIONAL',false,true,false,true,true,'UPLOAD_OR_SCAN','OFFICIAL_CONFIRMED','{"when":"deceased_is_uninsured_spouse_of_insured_person"}'::jsonb,NULL),
('SKN-FUN','REPRESENTATIVE_AUTHORIZATION','PAYMENT','OFFLINE','CONDITIONAL',false,false,true,true,true,'UPLOAD_OR_SCAN','OPERATIONAL_ASSUMED','{"when":"authorized_representative_claims_or_receives_payment"}'::jsonb,NULL),
('SKN-FUN','FUNERAL_CLAIM_FORM','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','OFFICIAL_CONFIRMED','{}'::jsonb,NULL),
('SKN-FUN','DEATH_CERT','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','OFFICIAL_CONFIRMED','{}'::jsonb,NULL),
('SKN-FUN','FUNERAL_INVOICE_RECEIPT','INTAKE','ONLINE','CONDITIONAL',true,true,false,true,true,'UPLOAD_ONLY','OFFICIAL_CONFIRMED','{"when":"director_requires_or_claimant_paid_expenses"}'::jsonb,NULL),
('SKN-FUN','BIRTH_CERT','EVIDENCE_REVIEW','ONLINE','CONDITIONAL',false,true,false,true,true,'UPLOAD_ONLY','OFFICIAL_CONFIRMED','{"when":"needed_to_confirm_deceased_identity_or_child_age"}'::jsonb,NULL),
('SKN-FUN','MARRIAGE_CERT','EVIDENCE_REVIEW','ONLINE','CONDITIONAL',false,true,false,true,true,'UPLOAD_ONLY','OFFICIAL_CONFIRMED','{"when":"deceased_is_uninsured_spouse_of_insured_person"}'::jsonb,NULL),
('SKN-FUN','REPRESENTATIVE_AUTHORIZATION','PAYMENT','ONLINE','CONDITIONAL',false,false,true,true,true,'UPLOAD_ONLY','OPERATIONAL_ASSUMED','{"when":"authorized_representative_claims_or_receives_payment"}'::jsonb,NULL),
('SKN-AGE','CLAIM_FORM','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-AGE','ID_CARD','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-AGE','SS_CARD','INTAKE','OFFLINE','WAIVABLE',false,false,false,true,true,'UPLOAD_OR_SCAN','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-AGE','BIRTH_CERT','INTAKE','OFFLINE','CONDITIONAL',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{"when":"date_of_birth_not_verified_in_ip_master"}'::jsonb,NULL),
('SKN-AGE','BANK_EFT','PAYMENT','OFFLINE','WAIVABLE',false,false,true,true,true,'UPLOAD_OR_SCAN','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-AGE','LIFE_CERT','POST_AWARD','OFFLINE','MANDATORY',false,false,true,true,true,'UPLOAD_OR_SCAN','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-AGE','CLAIM_FORM','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-AGE','ID_CARD','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-AGE','SS_CARD','INTAKE','ONLINE','WAIVABLE',false,false,false,true,true,'UPLOAD_ONLY','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-AGE','BIRTH_CERT','INTAKE','ONLINE','CONDITIONAL',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{"when":"date_of_birth_not_verified_in_ip_master"}'::jsonb,NULL),
('SKN-AGE','BANK_EFT','PAYMENT','ONLINE','WAIVABLE',false,false,true,true,true,'UPLOAD_ONLY','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-AGE','LIFE_CERT','POST_AWARD','ONLINE','MANDATORY',false,false,true,true,true,'UPLOAD_ONLY','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-INV','CLAIM_FORM','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-INV','ID_CARD','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-INV','MEDICAL_CERT','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-INV','MEDICAL_BOARD_REPORT','DECISION','OFFLINE','MANDATORY',false,true,false,false,true,'STAFF_VERIFIED','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-INV','BANK_EFT','PAYMENT','OFFLINE','WAIVABLE',false,false,true,true,true,'UPLOAD_OR_SCAN','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-INV','CLAIM_FORM','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-INV','ID_CARD','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-INV','MEDICAL_CERT','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-INV','MEDICAL_BOARD_REPORT','DECISION','ONLINE','MANDATORY',false,true,false,false,true,'STAFF_VERIFIED','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-INV','BANK_EFT','PAYMENT','ONLINE','WAIVABLE',false,false,true,true,true,'UPLOAD_ONLY','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-SUR','CLAIM_FORM','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-SUR','DEATH_CERT','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-SUR','PROOF_RELATION','EVIDENCE_REVIEW','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-SUR','MARRIAGE_CERT','EVIDENCE_REVIEW','OFFLINE','CONDITIONAL',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{"when":"spouse_claim"}'::jsonb,NULL),
('SKN-SUR','BIRTH_CERT','EVIDENCE_REVIEW','OFFLINE','CONDITIONAL',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{"when":"child_or_dependent_claim"}'::jsonb,NULL),
('SKN-SUR','SCHOOL_CERT','POST_AWARD','OFFLINE','CONDITIONAL',false,false,true,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{"when":"student_child_continuation"}'::jsonb,NULL),
('SKN-SUR','LIFE_CERT','POST_AWARD','OFFLINE','CONDITIONAL',false,false,true,true,true,'UPLOAD_OR_SCAN','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-SUR','BANK_EFT','PAYMENT','OFFLINE','WAIVABLE',false,false,true,true,true,'UPLOAD_OR_SCAN','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-SUR','CLAIM_FORM','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-SUR','DEATH_CERT','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-SUR','PROOF_RELATION','EVIDENCE_REVIEW','ONLINE','MANDATORY',false,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-SUR','MARRIAGE_CERT','EVIDENCE_REVIEW','ONLINE','CONDITIONAL',false,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{"when":"spouse_claim"}'::jsonb,NULL),
('SKN-SUR','BIRTH_CERT','EVIDENCE_REVIEW','ONLINE','CONDITIONAL',false,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{"when":"child_or_dependent_claim"}'::jsonb,NULL),
('SKN-SUR','SCHOOL_CERT','POST_AWARD','ONLINE','CONDITIONAL',false,false,true,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{"when":"student_child_continuation"}'::jsonb,NULL),
('SKN-SUR','LIFE_CERT','POST_AWARD','ONLINE','CONDITIONAL',false,false,true,true,true,'UPLOAD_ONLY','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-SUR','BANK_EFT','PAYMENT','ONLINE','WAIVABLE',false,false,true,true,true,'UPLOAD_ONLY','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-INJ','SICKNESS_INJURY_CLAIM_FORM','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-INJ','MEDICAL_CERT','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-INJ','EMPLOYER_INJURY_REPORT','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-INJ','EMPLOYER_CONF','EVIDENCE_REVIEW','OFFLINE','MANDATORY',false,true,false,false,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-INJ','BANK_EFT','PAYMENT','OFFLINE','WAIVABLE',false,false,true,true,true,'UPLOAD_OR_SCAN','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-INJ','SICKNESS_INJURY_CLAIM_FORM','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-INJ','MEDICAL_CERT','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-INJ','EMPLOYER_INJURY_REPORT','EVIDENCE_REVIEW','ONLINE','MANDATORY',false,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-INJ','EMPLOYER_CONF','EVIDENCE_REVIEW','ONLINE','MANDATORY',false,true,false,false,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-INJ','BANK_EFT','PAYMENT','ONLINE','WAIVABLE',false,false,true,true,true,'UPLOAD_ONLY','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-DIS','CLAIM_FORM','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-DIS','MEDICAL_CERT','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-DIS','EMPLOYER_INJURY_REPORT','EVIDENCE_REVIEW','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-DIS','MEDICAL_BOARD_REPORT','DECISION','OFFLINE','MANDATORY',false,true,false,false,true,'STAFF_VERIFIED','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-DIS','BANK_EFT','PAYMENT','OFFLINE','WAIVABLE',false,false,true,true,true,'UPLOAD_OR_SCAN','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-DIS','CLAIM_FORM','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-DIS','MEDICAL_CERT','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-DIS','EMPLOYER_INJURY_REPORT','EVIDENCE_REVIEW','ONLINE','MANDATORY',false,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-DIS','MEDICAL_BOARD_REPORT','DECISION','ONLINE','MANDATORY',false,true,false,false,true,'STAFF_VERIFIED','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-DIS','BANK_EFT','PAYMENT','ONLINE','WAIVABLE',false,false,true,true,true,'UPLOAD_ONLY','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-MED','CLAIM_FORM','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-MED','MEDICAL_CERT','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-MED','EMPLOYER_INJURY_REPORT','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-MED','MEDICAL_EXPENSE_RECEIPT','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-MED','PAYMENT_AUTHORIZATION','PAYMENT','OFFLINE','CONDITIONAL',false,false,true,true,true,'UPLOAD_OR_SCAN','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-MED','CLAIM_FORM','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-MED','MEDICAL_CERT','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-MED','MEDICAL_EXPENSE_RECEIPT','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-MED','EMPLOYER_INJURY_REPORT','EVIDENCE_REVIEW','ONLINE','MANDATORY',false,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-MED','PAYMENT_AUTHORIZATION','PAYMENT','ONLINE','CONDITIONAL',false,false,true,true,true,'UPLOAD_ONLY','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-DTH','CLAIM_FORM','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-DTH','DEATH_CERT','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-DTH','EMPLOYER_INJURY_REPORT','EVIDENCE_REVIEW','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-DTH','PROOF_RELATION','EVIDENCE_REVIEW','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-DTH','MARRIAGE_CERT','EVIDENCE_REVIEW','OFFLINE','CONDITIONAL',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{"when":"spouse_claim"}'::jsonb,NULL),
('SKN-EI-DTH','BIRTH_CERT','EVIDENCE_REVIEW','OFFLINE','CONDITIONAL',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{"when":"child_or_dependent_claim"}'::jsonb,NULL),
('SKN-EI-DTH','BANK_EFT','PAYMENT','OFFLINE','WAIVABLE',false,false,true,true,true,'UPLOAD_OR_SCAN','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-DTH','CLAIM_FORM','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-DTH','DEATH_CERT','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-DTH','EMPLOYER_INJURY_REPORT','EVIDENCE_REVIEW','ONLINE','MANDATORY',false,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-DTH','PROOF_RELATION','EVIDENCE_REVIEW','ONLINE','MANDATORY',false,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-EI-DTH','MARRIAGE_CERT','EVIDENCE_REVIEW','ONLINE','CONDITIONAL',false,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{"when":"spouse_claim"}'::jsonb,NULL),
('SKN-EI-DTH','BIRTH_CERT','EVIDENCE_REVIEW','ONLINE','CONDITIONAL',false,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{"when":"child_or_dependent_claim"}'::jsonb,NULL),
('SKN-EI-DTH','BANK_EFT','PAYMENT','ONLINE','WAIVABLE',false,false,true,true,true,'UPLOAD_ONLY','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-NCP','CLAIM_FORM','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-NCP','ID_CARD','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-NCP','BIRTH_CERT','INTAKE','OFFLINE','CONDITIONAL',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{"when":"date_of_birth_not_verified"}'::jsonb,NULL),
('SKN-NCP','RESIDENCY_PROOF','EVIDENCE_REVIEW','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-NCP','INCOME_PROOF','EVIDENCE_REVIEW','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-NCP','MEANS_TEST_REPORT','DECISION','OFFLINE','MANDATORY',false,true,false,false,true,'STAFF_VERIFIED','POLICY_ASSUMED','{}'::jsonb,'Internal-only means test'),
('SKN-NCP','BANK_EFT','PAYMENT','OFFLINE','WAIVABLE',false,false,true,true,true,'UPLOAD_OR_SCAN','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-NCP','LIFE_CERT','POST_AWARD','OFFLINE','MANDATORY',false,false,true,true,true,'UPLOAD_OR_SCAN','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-NCP','CLAIM_FORM','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-NCP','ID_CARD','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-NCP','RESIDENCY_PROOF','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-NCP','INCOME_PROOF','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-NCP','BIRTH_CERT','INTAKE','ONLINE','CONDITIONAL',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{"when":"date_of_birth_not_verified"}'::jsonb,NULL),
('SKN-NCP','MEANS_TEST_REPORT','DECISION','ONLINE','MANDATORY',false,true,false,false,true,'STAFF_VERIFIED','POLICY_ASSUMED','{}'::jsonb,'Internal-only means test'),
('SKN-NCP','BANK_EFT','PAYMENT','ONLINE','WAIVABLE',false,false,true,true,true,'UPLOAD_ONLY','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-NCP','LIFE_CERT','POST_AWARD','ONLINE','MANDATORY',false,false,true,true,true,'UPLOAD_ONLY','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-SVC-LIFE','LIFE_CERT','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-SVC-LIFE','ID_CARD','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-SVC-LIFE','LIFE_CERT','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-SVC-LIFE','ID_CARD','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-SVC-SCH','SCHOOL_CERT','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-SVC-SCH','BIRTH_CERT','EVIDENCE_REVIEW','OFFLINE','CONDITIONAL',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{"when":"child_identity_not_verified"}'::jsonb,NULL),
('SKN-SVC-SCH','SCHOOL_CERT','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-SVC-SCH','BIRTH_CERT','EVIDENCE_REVIEW','ONLINE','CONDITIONAL',false,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{"when":"child_identity_not_verified"}'::jsonb,NULL),
('SKN-SVC-EFT','BANK_EFT','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-SVC-EFT','ID_CARD','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-SVC-EFT','REPRESENTATIVE_AUTHORIZATION','EVIDENCE_REVIEW','OFFLINE','CONDITIONAL',false,true,false,true,true,'UPLOAD_OR_SCAN','OPERATIONAL_ASSUMED','{"when":"submitted_by_representative"}'::jsonb,NULL),
('SKN-SVC-EFT','BANK_EFT','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-SVC-EFT','ID_CARD','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-SVC-EFT','REPRESENTATIVE_AUTHORIZATION','EVIDENCE_REVIEW','ONLINE','CONDITIONAL',false,true,false,true,true,'UPLOAD_ONLY','OPERATIONAL_ASSUMED','{"when":"submitted_by_representative"}'::jsonb,NULL),
('SKN-SVC-EIR','EMPLOYER_CONF','INTAKE','OFFLINE','MANDATORY',false,true,false,true,true,'UPLOAD_OR_SCAN','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-SVC-EIR','CLAIM_FORM','INTAKE','OFFLINE','OPTIONAL',false,false,false,true,true,'UPLOAD_OR_SCAN','OPERATIONAL_ASSUMED','{}'::jsonb,NULL),
('SKN-SVC-EIR','EMPLOYER_CONF','INTAKE','ONLINE','MANDATORY',true,true,false,true,true,'UPLOAD_ONLY','POLICY_ASSUMED','{}'::jsonb,NULL),
('SKN-SVC-EIR','CLAIM_FORM','INTAKE','ONLINE','OPTIONAL',false,false,false,true,true,'UPLOAD_ONLY','OPERATIONAL_ASSUMED','{}'::jsonb,NULL);

INSERT INTO public.bn_doc_requirement (
  product_version_id, product_id, document_type_code, stage, channel_code,
  requirement_level, blocks_submission, blocks_decision, blocks_payment,
  public_visible, internal_visible, upload_mode, verification_status,
  condition_json, source_note, description, sort_order, is_active
)
SELECT
  pv.id, p.id, s.document_type_code, s.stage, s.channel_code,
  s.requirement_level, s.blocks_submission, s.blocks_decision, s.blocks_payment,
  s.public_visible, s.internal_visible, s.upload_mode, s.verification_status,
  s.condition_json, s.source_note,
  COALESCE(s.source_note, s.document_type_code || ' for ' || s.benefit_code), 0, true
FROM _seed_req s
JOIN public.bn_product p
  ON p.country_code = 'SKN' AND p.benefit_code = s.benefit_code
JOIN LATERAL (
  SELECT id FROM public.bn_product_version
  WHERE product_id = p.id AND status = 'ACTIVE'
  ORDER BY version_number DESC LIMIT 1
) pv ON true
ON CONFLICT (product_version_id, document_type_code, stage, channel_code) DO UPDATE
SET
  requirement_level = EXCLUDED.requirement_level,
  blocks_submission = EXCLUDED.blocks_submission,
  blocks_decision   = EXCLUDED.blocks_decision,
  blocks_payment    = EXCLUDED.blocks_payment,
  public_visible    = EXCLUDED.public_visible,
  internal_visible  = EXCLUDED.internal_visible,
  upload_mode       = EXCLUDED.upload_mode,
  verification_status = CASE
    WHEN bn_doc_requirement.verification_status = 'NEEDS_REVIEW' THEN EXCLUDED.verification_status
    ELSE bn_doc_requirement.verification_status
  END,
  condition_json = CASE
    WHEN bn_doc_requirement.condition_json = '{}'::jsonb THEN EXCLUDED.condition_json
    ELSE bn_doc_requirement.condition_json
  END,
  source_note = COALESCE(bn_doc_requirement.source_note, EXCLUDED.source_note),
  modified_at = now();
