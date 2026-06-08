
-- 1. Eligibility Fact Registry
CREATE TABLE IF NOT EXISTS public.bn_eligibility_fact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_key VARCHAR(80) NOT NULL UNIQUE,
  label VARCHAR(200) NOT NULL,
  category VARCHAR(40) NOT NULL,
  description TEXT,
  source_table VARCHAR(160),
  source_column VARCHAR(160),
  resolver_function VARCHAR(160),
  data_type VARCHAR(20) NOT NULL DEFAULT 'number',
  allowed_operators TEXT[] NOT NULL DEFAULT '{}',
  applicable_products TEXT[] NOT NULL DEFAULT '{}',
  example_value TEXT,
  implementation_status VARCHAR(20) NOT NULL DEFAULT 'NOT_IMPLEMENTED',
  requires_snapshot BOOLEAN NOT NULL DEFAULT false,
  requires_claim_context BOOLEAN NOT NULL DEFAULT false,
  requires_ssn BOOLEAN NOT NULL DEFAULT false,
  requires_deceased_ssn BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR(50),
  updated_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bn_elig_fact_status_chk CHECK (implementation_status IN ('IMPLEMENTED','PARTIAL','NOT_IMPLEMENTED')),
  CONSTRAINT bn_elig_fact_dtype_chk CHECK (data_type IN ('number','string','boolean','date','list'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_eligibility_fact TO authenticated;
GRANT ALL ON public.bn_eligibility_fact TO service_role;

CREATE INDEX IF NOT EXISTS idx_bn_elig_fact_category ON public.bn_eligibility_fact(category);
CREATE INDEX IF NOT EXISTS idx_bn_elig_fact_status ON public.bn_eligibility_fact(implementation_status);

CREATE OR REPLACE FUNCTION public.bn_eligibility_fact_touch() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
DROP TRIGGER IF EXISTS trg_bn_elig_fact_touch ON public.bn_eligibility_fact;
CREATE TRIGGER trg_bn_elig_fact_touch BEFORE UPDATE ON public.bn_eligibility_fact
  FOR EACH ROW EXECUTE FUNCTION public.bn_eligibility_fact_touch();

-- 2. Link rule catalogue to facts
ALTER TABLE public.bn_rule_catalogue
  ADD COLUMN IF NOT EXISTS fact_key VARCHAR(80),
  ADD COLUMN IF NOT EXISTS category VARCHAR(40);
CREATE INDEX IF NOT EXISTS idx_bn_rule_catalogue_fact_key ON public.bn_rule_catalogue(fact_key);

-- 3. Seed facts (idempotent)
INSERT INTO public.bn_eligibility_fact
  (fact_key, label, category, description, source_table, source_column, resolver_function, data_type, allowed_operators, example_value, implementation_status, requires_snapshot, requires_claim_context, requires_ssn, requires_deceased_ssn, created_by)
VALUES
  ('contribution.total_weeks','Total paid + credited weeks','CONTRIBUTION','Total contribution weeks from claim snapshot','bn_claim_contribution_snapshot','total_weeks','resolveContribTotalWeeks','number',ARRAY['=','!=','>','>=','<','<=','BETWEEN'],'520','IMPLEMENTED',true,true,true,false,'SEED'),
  ('contribution.paid_weeks','Paid contribution weeks','CONTRIBUTION',NULL,'bn_claim_contribution_snapshot','paid_weeks','resolveContribPaidWeeks','number',ARRAY['=','!=','>','>=','<','<=','BETWEEN'],'500','IMPLEMENTED',true,true,true,false,'SEED'),
  ('contribution.recent_weeks','Recent contribution weeks','CONTRIBUTION','Configured window (last 13/26 weeks)','bn_claim_contribution_snapshot','recent_weeks','resolveContribRecentWeeks','number',ARRAY['=','>','>=','<','<=','BETWEEN'],'26','PARTIAL',true,true,true,false,'SEED'),
  ('contribution.weeks_last_12_months','Contribution weeks in last 12 months','CONTRIBUTION',NULL,'bn_claim_contribution_snapshot','weeks_last_12_months','resolveWeeksLast12M','number',ARRAY['=','>','>=','<','<='],'52','PARTIAL',true,true,true,false,'SEED'),
  ('claim.days_since_event','Days between event and claim submission','CLAIM',NULL,'bn_claim','submission_date - event_date','resolveDaysSinceEvent','number',ARRAY['=','>','>=','<','<=','BETWEEN'],'14','IMPLEMENTED',false,true,false,false,'SEED'),
  ('document.medical_certificate_received','Medical certificate received','EVIDENCE',NULL,'bn_claim_document','status','resolveDocReceived','boolean',ARRAY['IS_TRUE','IS_FALSE','='],'true','IMPLEMENTED',false,true,false,false,'SEED'),
  ('document.medical_certificate.status','Medical certificate verification status','EVIDENCE',NULL,'bn_claim_document','status','resolveDocStatus','string',ARRAY['=','!=','IN'],'VERIFIED','IMPLEMENTED',false,true,false,false,'SEED'),
  ('document.death_certificate_received','Death certificate received','EVIDENCE',NULL,'bn_claim_document','status','resolveDocReceived','boolean',ARRAY['IS_TRUE','IS_FALSE','='],'true','IMPLEMENTED',false,true,false,true,'SEED'),
  ('document.death_certificate.status','Death certificate verification status','EVIDENCE',NULL,'bn_claim_document','status','resolveDocStatus','string',ARRAY['=','!=','IN'],'VERIFIED','IMPLEMENTED',false,true,false,true,'SEED'),
  ('employer.exists','Employer record exists','EMPLOYER',NULL,'er_master','reg_no','resolveEmployerExists','boolean',ARRAY['IS_TRUE','IS_FALSE','='],'true','IMPLEMENTED',false,true,true,false,'SEED'),
  ('employer.status','Employer status','EMPLOYER',NULL,'er_master','status','resolveEmployerStatus','string',ARRAY['=','!=','IN'],'ACTIVE','IMPLEMENTED',false,true,true,false,'SEED'),
  ('employer.active_on_injury_date','Employer active on injury date','EMPLOYER',NULL,'er_master','status, date_open, date_closed','resolveEmployerActiveOnDate','boolean',ARRAY['IS_TRUE','IS_FALSE','='],'true','PARTIAL',false,true,true,false,'SEED'),
  ('existing.duplicate_claim_same_period','Duplicate active claim for same period','CLAIM',NULL,'bn_claim','status, period','resolveDuplicateClaim','boolean',ARRAY['IS_TRUE','IS_FALSE','='],'false','IMPLEMENTED',false,true,true,false,'SEED'),
  ('person.age_at_claim_date','Insured person age at claim date','PERSON',NULL,'ip_master','dob','resolvePersonAgeAtClaim','number',ARRAY['=','!=','>','>=','<','<=','BETWEEN'],'62','IMPLEMENTED',false,true,true,false,'SEED'),
  ('medical_board.decision','Medical board decision','MEDICAL',NULL,'bn_medical_recommendation','decision','resolveMedicalBoardDecision','string',ARRAY['=','!=','IN'],'APPROVED','IMPLEMENTED',false,true,false,false,'SEED'),
  ('medical_board.invalidity_confirmed','Invalidity confirmed by medical board','MEDICAL',NULL,'bn_medical_recommendation','decision, finding','resolveInvalidityConfirmed','boolean',ARRAY['IS_TRUE','IS_FALSE','='],'true','PARTIAL',false,true,false,false,'SEED'),
  ('medical.disablement_percentage','Disablement percentage','MEDICAL',NULL,'bn_medical_recommendation','disablement_pct','resolveDisablementPct','number',ARRAY['=','>','>=','<','<=','BETWEEN'],'35','IMPLEMENTED',false,true,false,false,'SEED'),
  ('beneficiary.relationship_valid','Beneficiary relationship valid for product','SURVIVOR',NULL,'bn_award_beneficiary','relationship','resolveBeneficiaryRelationshipValid','boolean',ARRAY['IS_TRUE','IS_FALSE','='],'true','PARTIAL',false,true,false,true,'SEED'),
  ('funeral.responsibility_confirmed','Funeral responsibility confirmed','FUNERAL',NULL,'bn_claim_evidence','status','resolveFuneralResponsibilityConfirmed','boolean',ARRAY['IS_TRUE','IS_FALSE','='],'true','NOT_IMPLEMENTED',false,true,false,true,'SEED'),
  ('injury.work_related','Injury is work-related','INJURY',NULL,'bn_claim_evidence','status','resolveInjuryWorkRelated','boolean',ARRAY['IS_TRUE','IS_FALSE','='],'true','NOT_IMPLEMENTED',false,true,true,false,'SEED')
ON CONFLICT (fact_key) DO NOTHING;

-- 4. Backfill fact_key + category onto existing seeded catalogue rows
UPDATE public.bn_rule_catalogue SET fact_key='contribution.total_weeks', category='CONTRIBUTION' WHERE rule_code='MIN_TOTAL_CONTRIBUTIONS' AND fact_key IS NULL;
UPDATE public.bn_rule_catalogue SET fact_key='contribution.recent_weeks', category='CONTRIBUTION' WHERE rule_code='MIN_RECENT_CONTRIBUTIONS_13W' AND fact_key IS NULL;
UPDATE public.bn_rule_catalogue SET fact_key='contribution.weeks_last_12_months', category='CONTRIBUTION' WHERE rule_code='MIN_CONTRIBUTIONS_LAST_12M' AND fact_key IS NULL;
UPDATE public.bn_rule_catalogue SET fact_key='person.age_at_claim_date', category='PERSON' WHERE rule_code IN ('AGE_AT_LEAST','AGE_BELOW') AND fact_key IS NULL;
UPDATE public.bn_rule_catalogue SET fact_key='document.medical_certificate_received', category='EVIDENCE' WHERE rule_code='MEDICAL_CERT_REQUIRED' AND fact_key IS NULL;
UPDATE public.bn_rule_catalogue SET fact_key='employer.exists', category='EMPLOYER' WHERE rule_code='EMPLOYER_VERIFICATION_REQUIRED' AND fact_key IS NULL;
UPDATE public.bn_rule_catalogue SET fact_key='claim.days_since_event', category='CLAIM' WHERE rule_code='CLAIM_SUBMITTED_WITHIN_DAYS' AND fact_key IS NULL;
UPDATE public.bn_rule_catalogue SET fact_key='employer.status', category='EMPLOYER' WHERE rule_code='EMPLOYMENT_STATUS_ACTIVE' AND fact_key IS NULL;
UPDATE public.bn_rule_catalogue SET fact_key='injury.work_related', category='INJURY' WHERE rule_code='WORK_RELATED_INJURY' AND fact_key IS NULL;
UPDATE public.bn_rule_catalogue SET fact_key='medical_board.decision', category='MEDICAL' WHERE rule_code='MEDICAL_BOARD_CERTIFIED' AND fact_key IS NULL;
UPDATE public.bn_rule_catalogue SET fact_key='medical.disablement_percentage', category='MEDICAL' WHERE rule_code='MIN_DISABILITY_PERCENTAGE' AND fact_key IS NULL;

-- 5. Insert / refresh new spec rules with fact_key linkage
INSERT INTO public.bn_rule_catalogue
  (rule_code, rule_name, description, group_type, category, parameter, fact_key, operator, value_from, value_to, values, default_fail_action, failure_message_text, allow_product_override, tags, created_by)
VALUES
  ('MIN_PAID_CONTRIBUTIONS','Minimum paid contribution weeks','Min paid (excluding credited) weeks','CONTRIBUTION','CONTRIBUTION','PAID_CONTRIBUTIONS','contribution.paid_weeks','GREATER_OR_EQUAL',NULL,NULL,NULL,'REJECT','Insufficient paid contribution weeks',true,ARRAY['contribution'],'SEED'),
  ('MIN_RECENT_CONTRIBUTIONS','Minimum recent contribution weeks','Recent window per product','CONTRIBUTION','CONTRIBUTION','CONTRIBUTIONS_LAST_13_WEEKS','contribution.recent_weeks','GREATER_OR_EQUAL',NULL,NULL,NULL,'REJECT','Insufficient recent contributions',true,ARRAY['contribution','recent'],'SEED'),
  ('MEDICAL_CERTIFICATE_RECEIVED','Medical certificate received','Required medical certificate present','MEDICAL','EVIDENCE','HAS_MEDICAL_CERTIFICATE','document.medical_certificate_received','BOOLEAN','true',NULL,NULL,'BLOCK','Medical certificate not provided',false,ARRAY['medical','document'],'SEED'),
  ('MEDICAL_CERTIFICATE_VERIFIED','Medical certificate verified',NULL,'MEDICAL','EVIDENCE','HAS_MEDICAL_CERTIFICATE','document.medical_certificate.status','EQUALS','VERIFIED',NULL,NULL,'REFER','Medical certificate not yet verified',false,ARRAY['medical','document'],'SEED'),
  ('DEATH_CERTIFICATE_RECEIVED','Death certificate received',NULL,'FUNERAL','EVIDENCE','HAS_MEDICAL_CERTIFICATE','document.death_certificate_received','BOOLEAN','true',NULL,NULL,'BLOCK','Death certificate not provided',false,ARRAY['funeral','document'],'SEED'),
  ('DEATH_CERTIFICATE_VERIFIED','Death certificate verified',NULL,'FUNERAL','EVIDENCE','HAS_MEDICAL_CERTIFICATE','document.death_certificate.status','EQUALS','VERIFIED',NULL,NULL,'REFER','Death certificate not yet verified',false,ARRAY['funeral','document'],'SEED'),
  ('EMPLOYER_EXISTS','Employer exists',NULL,'EMPLOYMENT','EMPLOYER','HAS_EMPLOYER_VERIFICATION','employer.exists','BOOLEAN','true',NULL,NULL,'REJECT','Employer record not found',false,ARRAY['employer'],'SEED'),
  ('EMPLOYER_ACTIVE','Employer is active',NULL,'EMPLOYMENT','EMPLOYER','EMPLOYMENT_STATUS','employer.status','EQUALS','ACTIVE',NULL,NULL,'REJECT','Employer is not active',true,ARRAY['employer'],'SEED'),
  ('EMPLOYER_ACTIVE_ON_INJURY_DATE','Employer active on injury date',NULL,'INJURY','EMPLOYER','INJURY_WORK_RELATED','employer.active_on_injury_date','BOOLEAN','true',NULL,NULL,'REJECT','Employer not active on injury date',false,ARRAY['employer','injury'],'SEED'),
  ('NO_DUPLICATE_CLAIM','No duplicate active claim',NULL,'TIMING','CLAIM','CLAIM_SUBMISSION_DAYS','existing.duplicate_claim_same_period','BOOLEAN','false',NULL,NULL,'REJECT','Duplicate active claim exists for same period',false,ARRAY['claim'],'SEED'),
  ('PERSON_UNDER_PENSION_AGE','Person under pension age',NULL,'AGE','PERSON','AGE_AT_CLAIM','person.age_at_claim_date','LESS_THAN',NULL,NULL,NULL,'REJECT','Claimant has reached pension age',true,ARRAY['age'],'SEED'),
  ('PERSON_REACHED_PENSION_AGE','Person reached pension age',NULL,'AGE','PERSON','AGE_AT_CLAIM','person.age_at_claim_date','GREATER_OR_EQUAL',NULL,NULL,NULL,'REJECT','Claimant has not reached pension age',true,ARRAY['age'],'SEED'),
  ('MEDICAL_BOARD_APPROVED','Medical board approved',NULL,'MEDICAL','MEDICAL','MEDICAL_BOARD_CERTIFIED','medical_board.decision','EQUALS','APPROVED',NULL,NULL,'REFER','Medical board has not approved',false,ARRAY['medical'],'SEED'),
  ('INVALIDITY_CONFIRMED','Invalidity confirmed',NULL,'MEDICAL','MEDICAL','MEDICAL_BOARD_CERTIFIED','medical_board.invalidity_confirmed','BOOLEAN','true',NULL,NULL,'REJECT','Invalidity not confirmed',false,ARRAY['medical'],'SEED'),
  ('DISABLEMENT_PERCENTAGE_MIN','Minimum disablement percentage',NULL,'MEDICAL','MEDICAL','DISABILITY_PERCENTAGE','medical.disablement_percentage','GREATER_OR_EQUAL',NULL,NULL,NULL,'REJECT','Disablement percentage below minimum',true,ARRAY['medical'],'SEED'),
  ('BENEFICIARY_RELATIONSHIP_VALID','Beneficiary relationship valid',NULL,'DEPENDENCY','SURVIVOR','IS_DEPENDENT','beneficiary.relationship_valid','BOOLEAN','true',NULL,NULL,'REJECT','Beneficiary relationship not valid for product',false,ARRAY['survivor'],'SEED'),
  ('FUNERAL_RESPONSIBILITY_CONFIRMED','Funeral responsibility confirmed',NULL,'FUNERAL','FUNERAL','FUNERAL_INVOICE_AMOUNT','funeral.responsibility_confirmed','BOOLEAN','true',NULL,NULL,'BLOCK','Funeral responsibility not confirmed',false,ARRAY['funeral'],'SEED')
ON CONFLICT (rule_code) DO UPDATE
  SET fact_key = COALESCE(public.bn_rule_catalogue.fact_key, EXCLUDED.fact_key),
      category = COALESCE(public.bn_rule_catalogue.category, EXCLUDED.category);
