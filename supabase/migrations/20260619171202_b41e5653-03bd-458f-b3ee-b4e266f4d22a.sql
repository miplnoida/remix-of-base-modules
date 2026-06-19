
-- 1. Add 3 additional reference values to cover seeded data that doesn't fit the original 10
WITH g AS (SELECT id FROM public.bn_reference_group WHERE group_code = 'BN_SERVICE_DOCUMENT_CATEGORY')
INSERT INTO public.bn_reference_value (group_id, value_code, value_label, sort_order, is_system, is_active)
SELECT g.id, v.value_code, v.value_label, v.sort_order, true, true
FROM g, (VALUES
  ('FORM',          'Form',          110),
  ('ASSESSMENT',    'Assessment',    120),
  ('AUTHORIZATION', 'Authorization', 130)
) AS v(value_code, value_label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.bn_reference_value rv
  WHERE rv.group_id = g.id AND rv.value_code = v.value_code
);

-- 2. Normalize legacy category codes to the canonical reference values
UPDATE public.bn_service_doc_type SET category = 'RELATIONSHIP' WHERE category = 'RELATION';
UPDATE public.bn_service_doc_type SET category = 'EMPLOYMENT'   WHERE category = 'EMPLOYER';

-- Re-classify a few rows to their better-fitting category
UPDATE public.bn_service_doc_type SET category = 'EDUCATION' WHERE type_code = 'SCHOOL_CERT';
UPDATE public.bn_service_doc_type SET category = 'LEGAL'     WHERE type_code = 'POLICE_REPORT';
UPDATE public.bn_service_doc_type SET category = 'PAYMENT'   WHERE type_code IN ('BANK_EFT', 'PAYMENT_AUTHORIZATION');
UPDATE public.bn_service_doc_type SET category = 'FUNERAL'   WHERE type_code IN ('FUNERAL_INVOICE_RECEIPT', 'FUNERAL_CLAIM_FORM');

-- 3. Backfill default_expiry_days where it makes sense
UPDATE public.bn_service_doc_type SET default_expiry_days = CASE type_code
    WHEN 'ID_CARD'                              THEN 3650
    WHEN 'SS_CARD'                              THEN 3650
    WHEN 'RESIDENCY_PROOF'                      THEN 180
    WHEN 'INCOME_PROOF'                         THEN 90
    WHEN 'BANK_EFT'                             THEN 730
    WHEN 'PAYMENT_AUTHORIZATION'                THEN 365
    WHEN 'MEDICAL_CERT'                         THEN 90
    WHEN 'MEDICAL_BOARD_REPORT'                 THEN 365
    WHEN 'MATERNITY_EXPECTED_CONFINEMENT_CERT'  THEN 90
    WHEN 'MATERNITY_ACTUAL_CONFINEMENT_CERT'    THEN 180
    WHEN 'EMPLOYER_INJURY_REPORT'               THEN 30
    WHEN 'POLICE_REPORT'                        THEN 365
    WHEN 'MEANS_TEST_REPORT'                    THEN 180
    WHEN 'FUNERAL_INVOICE_RECEIPT'              THEN 180
    WHEN 'MEDICAL_EXPENSE_RECEIPT'              THEN 180
    WHEN 'DEPENDANT_PROOF'                      THEN 365
    WHEN 'PROOF_RELATION'                       THEN 1825
    WHEN 'SURVIVOR_CERT'                        THEN 1825
    WHEN 'REPRESENTATIVE_AUTHORIZATION'         THEN 365
    WHEN 'APPLICANT_DECLARATION'                THEN 180
    ELSE default_expiry_days
END
WHERE type_code IN (
  'ID_CARD','SS_CARD','RESIDENCY_PROOF','INCOME_PROOF','BANK_EFT','PAYMENT_AUTHORIZATION',
  'MEDICAL_CERT','MEDICAL_BOARD_REPORT','MATERNITY_EXPECTED_CONFINEMENT_CERT','MATERNITY_ACTUAL_CONFINEMENT_CERT',
  'EMPLOYER_INJURY_REPORT','POLICE_REPORT','MEANS_TEST_REPORT','FUNERAL_INVOICE_RECEIPT',
  'MEDICAL_EXPENSE_RECEIPT','DEPENDANT_PROOF','PROOF_RELATION','SURVIVOR_CERT',
  'REPRESENTATIVE_AUTHORIZATION','APPLICANT_DECLARATION'
);

-- 4. Witness requirement — official affidavits / authorizations / survivor proofs
UPDATE public.bn_service_doc_type SET requires_witness = true
WHERE type_code IN (
  'MARRIAGE_CERT','PROOF_RELATION','SURVIVOR_CERT','DEPENDANT_PROOF',
  'REPRESENTATIVE_AUTHORIZATION','APPLICANT_DECLARATION','PAYMENT_AUTHORIZATION'
);

-- 5. Periodic renewal flag
UPDATE public.bn_service_doc_type SET periodic_renewal = true
WHERE type_code IN ('LIFE_CERT','SCHOOL_CERT','RESIDENCY_PROOF','MEDICAL_BOARD_REPORT');

-- 6. Verification requirement + level
-- 6a. NOTARIZED — civil-registry & state-issued IDs
UPDATE public.bn_service_doc_type
SET requires_verification = true, verification_level = 'NOTARIZED'
WHERE type_code IN (
  'BIRTH_CERT','DEATH_CERT','MARRIAGE_CERT','ID_CARD','SS_CARD',
  'SURVIVOR_CERT','REPRESENTATIVE_AUTHORIZATION'
);

-- 6b. ENHANCED — medical, assessment & injury documentation
UPDATE public.bn_service_doc_type
SET requires_verification = true, verification_level = 'ENHANCED'
WHERE type_code IN (
  'MEDICAL_CERT','MEDICAL_BOARD_REPORT','MATERNITY_EXPECTED_CONFINEMENT_CERT',
  'MATERNITY_ACTUAL_CONFINEMENT_CERT','EMPLOYER_INJURY_REPORT','INJURY_REPORT',
  'MEANS_TEST_REPORT','POLICE_REPORT'
);

-- 6c. STANDARD — financial & employment confirmations
UPDATE public.bn_service_doc_type
SET requires_verification = true, verification_level = 'STANDARD'
WHERE type_code IN (
  'BANK_EFT','PAYMENT_AUTHORIZATION','INCOME_PROOF','EMPLOYER_CONF',
  'FUNERAL_INVOICE_RECEIPT','MEDICAL_EXPENSE_RECEIPT','SCHOOL_CERT',
  'LIFE_CERT','RESIDENCY_PROOF','DEPENDANT_PROOF','PROOF_RELATION'
);

-- 6d. BASIC — internal forms & declarations
UPDATE public.bn_service_doc_type
SET requires_verification = true, verification_level = 'BASIC'
WHERE type_code IN (
  'CLAIM_FORM','MATERNITY_CLAIM_FORM','FUNERAL_CLAIM_FORM',
  'SICKNESS_INJURY_CLAIM_FORM','APPLICANT_DECLARATION'
);
