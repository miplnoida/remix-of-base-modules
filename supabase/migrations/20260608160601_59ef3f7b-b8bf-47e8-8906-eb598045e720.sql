
-- 1. Catalogue table
CREATE TABLE IF NOT EXISTS public.bn_rule_catalogue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code VARCHAR(60) NOT NULL UNIQUE,
  rule_name VARCHAR(200) NOT NULL,
  description TEXT,
  group_type VARCHAR(40) NOT NULL,
  parameter VARCHAR(60) NOT NULL,
  operator VARCHAR(30) NOT NULL,
  value_from TEXT,
  value_to TEXT,
  values JSONB,
  default_fail_action VARCHAR(20) NOT NULL DEFAULT 'REJECT',
  failure_message_text TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  allow_product_override BOOLEAN NOT NULL DEFAULT true,
  tags TEXT[] NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  effective_from DATE,
  effective_to DATE,
  created_by VARCHAR(50),
  updated_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bn_rule_catalogue_fail_action_chk CHECK (default_fail_action IN ('REJECT','BLOCK','REFER'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_rule_catalogue TO authenticated;
GRANT ALL ON public.bn_rule_catalogue TO service_role;

CREATE INDEX IF NOT EXISTS idx_bn_rule_catalogue_group ON public.bn_rule_catalogue(group_type);
CREATE INDEX IF NOT EXISTS idx_bn_rule_catalogue_active ON public.bn_rule_catalogue(is_active);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.bn_rule_catalogue_touch() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_bn_rule_catalogue_touch ON public.bn_rule_catalogue;
CREATE TRIGGER trg_bn_rule_catalogue_touch BEFORE UPDATE ON public.bn_rule_catalogue
  FOR EACH ROW EXECUTE FUNCTION public.bn_rule_catalogue_touch();

-- 2. Link columns on product eligibility rules
ALTER TABLE public.bn_eligibility_rule
  ADD COLUMN IF NOT EXISTS catalogue_rule_code VARCHAR(60),
  ADD COLUMN IF NOT EXISTS catalogue_rule_version INTEGER,
  ADD COLUMN IF NOT EXISTS override_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_bn_eligibility_rule_catalogue_code
  ON public.bn_eligibility_rule(catalogue_rule_code);

-- 3. Seed 25 reusable rules (idempotent)
INSERT INTO public.bn_rule_catalogue
  (rule_code, rule_name, description, group_type, parameter, operator, value_from, value_to, values, default_fail_action, failure_message_text, allow_product_override, tags, created_by)
VALUES
  ('MIN_TOTAL_CONTRIBUTIONS','Minimum total paid contribution weeks','Minimum total paid contribution weeks required','CONTRIBUTION','TOTAL_CONTRIBUTIONS','GREATER_OR_EQUAL',NULL,NULL,NULL,'REJECT','Insufficient total paid contribution weeks',true,ARRAY['contribution','minimum'],'SEED'),
  ('MIN_RECENT_CONTRIBUTIONS_13W','Minimum recent contributions in last 13 weeks',NULL,'CONTRIBUTION','CONTRIBUTIONS_LAST_13_WEEKS','GREATER_OR_EQUAL',NULL,NULL,NULL,'REJECT','Insufficient contributions in last 13 weeks',true,ARRAY['contribution','recent'],'SEED'),
  ('MIN_CONTRIBUTIONS_LAST_12M','Minimum contributions in last 12 months',NULL,'CONTRIBUTION','CONTRIBUTIONS_LAST_12_MONTHS','GREATER_OR_EQUAL',NULL,NULL,NULL,'REJECT','Insufficient contributions in last 12 months',true,ARRAY['contribution'],'SEED'),
  ('AGE_AT_LEAST','Minimum age requirement',NULL,'AGE','AGE_AT_CLAIM','GREATER_OR_EQUAL',NULL,NULL,NULL,'REJECT','Claimant does not meet minimum age',true,ARRAY['age'],'SEED'),
  ('AGE_BELOW','Below maximum age / pension age',NULL,'AGE','AGE_AT_CLAIM','LESS_THAN',NULL,NULL,NULL,'REJECT','Claimant exceeds maximum age',true,ARRAY['age'],'SEED'),
  ('MEDICAL_CERT_REQUIRED','Medical certificate required',NULL,'MEDICAL','HAS_MEDICAL_CERTIFICATE','BOOLEAN','true',NULL,NULL,'BLOCK','Medical certificate not provided',false,ARRAY['medical','document'],'SEED'),
  ('EMPLOYER_VERIFICATION_REQUIRED','Employer verification required',NULL,'EMPLOYMENT','HAS_EMPLOYER_VERIFICATION','BOOLEAN','true',NULL,NULL,'BLOCK','Employer verification missing',false,ARRAY['employment','document'],'SEED'),
  ('CLAIM_SUBMITTED_WITHIN_DAYS','Claim submitted within allowed days',NULL,'TIMING','CLAIM_SUBMISSION_DAYS','LESS_OR_EQUAL',NULL,NULL,NULL,'REFER','Claim submitted beyond allowed window',true,ARRAY['timing'],'SEED'),
  ('EMPLOYMENT_STATUS_ACTIVE','Employment status active',NULL,'EMPLOYMENT','EMPLOYMENT_STATUS','EQUALS','ACTIVE',NULL,NULL,'REJECT','Employment status is not active',true,ARRAY['employment'],'SEED'),
  ('WORK_RELATED_INJURY','Injury is work-related',NULL,'INJURY','INJURY_WORK_RELATED','BOOLEAN','true',NULL,NULL,'REJECT','Injury is not work-related',false,ARRAY['injury'],'SEED'),
  ('MEDICAL_BOARD_CERTIFIED','Medical board certification required',NULL,'MEDICAL','MEDICAL_BOARD_CERTIFIED','BOOLEAN','true',NULL,NULL,'REFER','Medical board certification pending',false,ARRAY['medical'],'SEED'),
  ('MIN_DISABILITY_PERCENTAGE','Minimum disability percentage',NULL,'MEDICAL','DISABILITY_PERCENTAGE','GREATER_OR_EQUAL',NULL,NULL,NULL,'REJECT','Disability percentage below minimum',true,ARRAY['medical'],'SEED'),
  ('DECEASED_MIN_CONTRIBUTIONS','Deceased insured person contribution requirement',NULL,'CONTRIBUTION','DECEASED_CONTRIBUTIONS','GREATER_OR_EQUAL',NULL,NULL,NULL,'REJECT','Deceased did not meet contribution requirement',true,ARRAY['contribution','survivor'],'SEED'),
  ('DEATH_DATE_EXISTS','Death date required',NULL,'FUNERAL','DEATH_DATE','EXISTS','true',NULL,NULL,'BLOCK','Death date not provided',false,ARRAY['funeral'],'SEED'),
  ('FUNERAL_INVOICE_REQUIRED','Funeral invoice amount required',NULL,'FUNERAL','FUNERAL_INVOICE_AMOUNT','GREATER_THAN','0',NULL,NULL,'BLOCK','Funeral invoice amount not provided',false,ARRAY['funeral'],'SEED'),
  ('SPOUSE_ELIGIBLE','Claimant is spouse',NULL,'DEPENDENCY','IS_SPOUSE','BOOLEAN','true',NULL,NULL,'REJECT','Claimant is not the spouse',false,ARRAY['dependency'],'SEED'),
  ('CHILD_ELIGIBLE','Claimant is child',NULL,'DEPENDENCY','IS_CHILD','BOOLEAN','true',NULL,NULL,'REJECT','Claimant is not a child',false,ARRAY['dependency'],'SEED'),
  ('DEPENDENT_ELIGIBLE','Claimant is dependent',NULL,'DEPENDENCY','IS_DEPENDENT','BOOLEAN','true',NULL,NULL,'REJECT','Claimant is not a dependent',false,ARRAY['dependency'],'SEED'),
  ('CHILD_AGE_LIMIT','Child age within allowed limit',NULL,'DEPENDENCY','CHILD_AGE','LESS_OR_EQUAL',NULL,NULL,NULL,'REJECT','Child age exceeds limit',true,ARRAY['dependency'],'SEED'),
  ('CHILD_IN_EDUCATION','Child in education',NULL,'DEPENDENCY','CHILD_IN_EDUCATION','BOOLEAN','true',NULL,NULL,'REFER','Education status not confirmed',true,ARRAY['dependency'],'SEED'),
  ('RESIDENCE_CONFIRMED','Residence confirmed',NULL,'RESIDENCE','RESIDENCE_CONFIRMED','BOOLEAN','true',NULL,NULL,'REJECT','Residence not confirmed',false,ARRAY['residence'],'SEED'),
  ('MEANS_TEST_INCOME_LIMIT','Means test income below threshold',NULL,'MEANS_TEST','MEANS_TEST_INCOME','LESS_OR_EQUAL',NULL,NULL,NULL,'REJECT','Income exceeds means-test threshold',true,ARRAY['means-test'],'SEED'),
  ('EXPECTED_DELIVERY_DATE_EXISTS','Expected delivery date required',NULL,'MATERNITY','EXPECTED_DELIVERY_DATE','EXISTS','true',NULL,NULL,'BLOCK','Expected delivery date not provided',false,ARRAY['maternity'],'SEED'),
  ('CONFINEMENT_DATE_EXISTS','Confinement date required',NULL,'MATERNITY','CONFINEMENT_DATE','EXISTS','true',NULL,NULL,'BLOCK','Confinement date not provided',false,ARRAY['maternity'],'SEED'),
  ('LAST_DAY_WORKED_EXISTS','Last day worked required',NULL,'EMPLOYMENT','LAST_DAY_WORKED','EXISTS','true',NULL,NULL,'BLOCK','Last day worked not recorded',false,ARRAY['employment'],'SEED')
ON CONFLICT (rule_code) DO NOTHING;
