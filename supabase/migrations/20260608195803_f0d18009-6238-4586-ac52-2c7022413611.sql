
-- 1. Add denormalized rule_group_name to catalogue
ALTER TABLE public.bn_rule_catalogue
  ADD COLUMN IF NOT EXISTS rule_group_name varchar(100);

-- 2. Ensure new master rule groups exist
INSERT INTO public.bn_rule_group (group_code, group_name, description, sort_order, is_active)
VALUES
  ('DOCUMENT_CHECKS',    'Document Checks',     'Death/birth/employer/funeral document checks', 80, true),
  ('DEPENDENCY_CHECKS',  'Dependency Checks',   'Spouse, child, dependent eligibility checks',  90, true)
ON CONFLICT (group_code) DO NOTHING;

-- 3. Per-rule remap to match user-approved group taxonomy
-- COMMON_ELIGIBILITY
UPDATE public.bn_rule_catalogue rc
   SET rule_group_id   = g.id,
       rule_group_code = g.group_code,
       rule_group_name = g.group_name
  FROM public.bn_rule_group g
 WHERE g.group_code = 'COMMON_ELIGIBILITY'
   AND rc.rule_code IN ('NO_DUPLICATE_CLAIM');

-- AGE-RULES
UPDATE public.bn_rule_catalogue rc
   SET rule_group_id = g.id, rule_group_code = g.group_code, rule_group_name = g.group_name
  FROM public.bn_rule_group g
 WHERE g.group_code = 'AGE-RULES'
   AND rc.rule_code IN ('PERSON_REACHED_PENSION_AGE','PERSON_UNDER_PENSION_AGE','AGE_AT_LEAST','AGE_BELOW');

-- EMPLOYMENT_CHECKS
UPDATE public.bn_rule_catalogue rc
   SET rule_group_id = g.id, rule_group_code = g.group_code, rule_group_name = g.group_name
  FROM public.bn_rule_group g
 WHERE g.group_code = 'EMPLOYMENT_CHECKS'
   AND rc.rule_code IN ('EMPLOYER_EXISTS','EMPLOYER_ACTIVE','EMPLOYMENT_STATUS_ACTIVE','EMPLOYER_VERIFICATION_REQUIRED','LAST_DAY_WORKED_EXISTS');

-- EMPLOYMENT_INJURY_CHECKS
UPDATE public.bn_rule_catalogue rc
   SET rule_group_id = g.id, rule_group_code = g.group_code, rule_group_name = g.group_name
  FROM public.bn_rule_group g
 WHERE g.group_code = 'EMPLOYMENT_INJURY_CHECKS'
   AND rc.rule_code IN ('EMPLOYER_ACTIVE_ON_INJURY_DATE','WORK_RELATED_INJURY');

-- CONTRIB-STB
UPDATE public.bn_rule_catalogue rc
   SET rule_group_id = g.id, rule_group_code = g.group_code, rule_group_name = g.group_name
  FROM public.bn_rule_group g
 WHERE g.group_code = 'CONTRIB-STB'
   AND rc.rule_code IN ('MIN_TOTAL_CONTRIBUTIONS','MIN_PAID_CONTRIBUTIONS','MIN_RECENT_CONTRIBUTIONS','MIN_RECENT_CONTRIBUTIONS_13W','MIN_CONTRIBUTIONS_LAST_12M');

-- CONTRIB-LTB: only DECEASED for now; LTB shares MIN_TOTAL/PAID but they're already in STB.
-- (Skip to avoid moving them; LTB-specific rules can be added later.)

-- TIMING_CHECKS
UPDATE public.bn_rule_catalogue rc
   SET rule_group_id = g.id, rule_group_code = g.group_code, rule_group_name = g.group_name
  FROM public.bn_rule_group g
 WHERE g.group_code = 'TIMING_CHECKS'
   AND rc.rule_code IN ('CLAIM_SUBMITTED_WITHIN_DAYS');

-- MEDICAL (clinical/medical board)
UPDATE public.bn_rule_catalogue rc
   SET rule_group_id = g.id, rule_group_code = g.group_code, rule_group_name = g.group_name
  FROM public.bn_rule_group g
 WHERE g.group_code = 'MEDICAL'
   AND rc.rule_code IN ('MEDICAL_CERTIFICATE_RECEIVED','MEDICAL_CERTIFICATE_VERIFIED','MEDICAL_BOARD_APPROVED','INVALIDITY_CONFIRMED','DISABLEMENT_PERCENTAGE_MIN','MEDICAL_CERT_REQUIRED','MEDICAL_BOARD_CERTIFIED','MIN_DISABILITY_PERCENTAGE');

-- DOCUMENT_CHECKS
UPDATE public.bn_rule_catalogue rc
   SET rule_group_id = g.id, rule_group_code = g.group_code, rule_group_name = g.group_name
  FROM public.bn_rule_group g
 WHERE g.group_code = 'DOCUMENT_CHECKS'
   AND rc.rule_code IN ('DEATH_CERTIFICATE_RECEIVED','DEATH_CERTIFICATE_VERIFIED');

-- DEPENDENCY_CHECKS
UPDATE public.bn_rule_catalogue rc
   SET rule_group_id = g.id, rule_group_code = g.group_code, rule_group_name = g.group_name
  FROM public.bn_rule_group g
 WHERE g.group_code = 'DEPENDENCY_CHECKS'
   AND rc.rule_code IN ('BENEFICIARY_RELATIONSHIP_VALID','CHILD_AGE_LIMIT','CHILD_IN_EDUCATION','SPOUSE_ELIGIBLE','CHILD_ELIGIBLE','DEPENDENT_ELIGIBLE');

-- FUNERAL_CHECKS
UPDATE public.bn_rule_catalogue rc
   SET rule_group_id = g.id, rule_group_code = g.group_code, rule_group_name = g.group_name
  FROM public.bn_rule_group g
 WHERE g.group_code = 'FUNERAL_CHECKS'
   AND rc.rule_code IN ('FUNERAL_RESPONSIBILITY_CONFIRMED','FUNERAL_INVOICE_REQUIRED','DECEASED_MIN_CONTRIBUTIONS','DEATH_DATE_EXISTS');

-- MATERNITY_CHECKS
UPDATE public.bn_rule_catalogue rc
   SET rule_group_id = g.id, rule_group_code = g.group_code, rule_group_name = g.group_name
  FROM public.bn_rule_group g
 WHERE g.group_code = 'MATERNITY_CHECKS'
   AND rc.rule_code IN ('EXPECTED_DELIVERY_DATE_EXISTS','CONFINEMENT_DATE_EXISTS');

-- MEANS-TEST
UPDATE public.bn_rule_catalogue rc
   SET rule_group_id = g.id, rule_group_code = g.group_code, rule_group_name = g.group_name
  FROM public.bn_rule_group g
 WHERE g.group_code = 'MEANS-TEST'
   AND rc.rule_code IN ('MEANS_TEST_INCOME_LIMIT');

-- 4. Backfill rule_group_name for any rule_group_id already set but missing name
UPDATE public.bn_rule_catalogue rc
   SET rule_group_name = g.group_name,
       rule_group_code = g.group_code
  FROM public.bn_rule_group g
 WHERE rc.rule_group_id = g.id
   AND (rc.rule_group_name IS NULL OR rc.rule_group_name <> g.group_name);
