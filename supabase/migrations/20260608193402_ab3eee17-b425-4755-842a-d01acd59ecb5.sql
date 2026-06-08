-- Link Rule Catalogue rules to existing Rule Groups, and stamp catalogue_rule_id on product eligibility rows.

ALTER TABLE public.bn_rule_catalogue
  ADD COLUMN IF NOT EXISTS rule_group_id uuid REFERENCES public.bn_rule_group(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rule_group_code varchar(30),
  ADD COLUMN IF NOT EXISTS default_group_sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_rule_sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_bn_rule_catalogue_group_id ON public.bn_rule_catalogue(rule_group_id);
CREATE INDEX IF NOT EXISTS idx_bn_rule_catalogue_group_code ON public.bn_rule_catalogue(rule_group_code);

ALTER TABLE public.bn_eligibility_rule
  ADD COLUMN IF NOT EXISTS catalogue_rule_id uuid REFERENCES public.bn_rule_catalogue(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bn_eligibility_rule_catalogue_id ON public.bn_eligibility_rule(catalogue_rule_id);

-- Seed groups referenced by request (idempotent)
INSERT INTO public.bn_rule_group (group_code, group_name, description, sort_order, is_active, entered_by)
VALUES
  ('COMMON_ELIGIBILITY','Common Eligibility','Shared cross-benefit eligibility checks',10,true,'SEED-RULE-GROUPS'),
  ('EMPLOYMENT_CHECKS','Employment Checks','Employer existence and active status',20,true,'SEED-RULE-GROUPS'),
  ('EMPLOYMENT_INJURY_CHECKS','Employment Injury Checks','Employer + injury report checks',25,true,'SEED-RULE-GROUPS'),
  ('CONTRIBUTION_CHECKS','Contribution Checks','Total/paid/recent contribution thresholds',30,true,'SEED-RULE-GROUPS'),
  ('TIMING_CHECKS','Timing Checks','Submission/reporting windows',40,true,'SEED-RULE-GROUPS'),
  ('DOCUMENT_MEDICAL_CHECKS','Document - Medical','Medical certificate received/verified',50,true,'SEED-RULE-GROUPS'),
  ('DEATH_DOCUMENT_CHECKS','Document - Death','Death certificate received/verified',55,true,'SEED-RULE-GROUPS'),
  ('MEDICAL_BOARD_CHECKS','Medical Board','Board approval and disablement %',60,true,'SEED-RULE-GROUPS'),
  ('FUNERAL_CHECKS','Funeral Checks','Funeral grant eligibility checks',65,true,'SEED-RULE-GROUPS'),
  ('SURVIVOR_DEPENDENCY_CHECKS','Survivor Dependency','Beneficiary and child eligibility',70,true,'SEED-RULE-GROUPS'),
  ('MATERNITY_CHECKS','Maternity Checks','Maternity-specific checks',75,true,'SEED-RULE-GROUPS')
ON CONFLICT (group_code) DO NOTHING;

-- Map known catalogue rule codes to groups
WITH map(rule_code, group_code) AS (
  VALUES
    ('NO_DUPLICATE_CLAIM','COMMON_ELIGIBILITY'),
    ('PERSON_ALIVE_STATUS','COMMON_ELIGIBILITY'),
    ('EMPLOYER_EXISTS','EMPLOYMENT_CHECKS'),
    ('EMPLOYER_ACTIVE','EMPLOYMENT_CHECKS'),
    ('EMPLOYER_ACTIVE_ON_INJURY_DATE','EMPLOYMENT_INJURY_CHECKS'),
    ('EMPLOYER_REPORT_RECEIVED','EMPLOYMENT_INJURY_CHECKS'),
    ('EMPLOYER_REPORT_VERIFIED','EMPLOYMENT_INJURY_CHECKS'),
    ('MIN_TOTAL_CONTRIBUTIONS','CONTRIBUTION_CHECKS'),
    ('MIN_PAID_CONTRIBUTIONS','CONTRIBUTION_CHECKS'),
    ('MIN_RECENT_CONTRIBUTIONS','CONTRIBUTION_CHECKS'),
    ('MIN_CONTRIBUTIONS_LAST_13','CONTRIBUTION_CHECKS'),
    ('MIN_CONTRIBUTIONS_LAST_26','CONTRIBUTION_CHECKS'),
    ('MIN_CONTRIBUTIONS_LAST_39','CONTRIBUTION_CHECKS'),
    ('MIN_CONTRIBUTIONS_LAST_12M','CONTRIBUTION_CHECKS'),
    ('CLAIM_SUBMITTED_WITHIN_DAYS','TIMING_CHECKS'),
    ('CLAIM_REPORTED_WITHIN_DAYS','TIMING_CHECKS'),
    ('MEDICAL_CERTIFICATE_RECEIVED','DOCUMENT_MEDICAL_CHECKS'),
    ('MEDICAL_CERTIFICATE_VERIFIED','DOCUMENT_MEDICAL_CHECKS'),
    ('DEATH_CERTIFICATE_RECEIVED','DEATH_DOCUMENT_CHECKS'),
    ('DEATH_CERTIFICATE_VERIFIED','DEATH_DOCUMENT_CHECKS'),
    ('MEDICAL_BOARD_APPROVED','MEDICAL_BOARD_CHECKS'),
    ('INVALIDITY_CONFIRMED','MEDICAL_BOARD_CHECKS'),
    ('DISABLEMENT_PERCENTAGE_MIN','MEDICAL_BOARD_CHECKS'),
    ('DECEASED_MIN_CONTRIBUTIONS','FUNERAL_CHECKS'),
    ('FUNERAL_RESPONSIBILITY_CONFIRMED','FUNERAL_CHECKS'),
    ('FUNERAL_INVOICE_VERIFIED','FUNERAL_CHECKS'),
    ('BENEFICIARY_RELATIONSHIP_VALID','SURVIVOR_DEPENDENCY_CHECKS'),
    ('CHILD_IN_EDUCATION','SURVIVOR_DEPENDENCY_CHECKS'),
    ('CHILD_AGE_LIMIT','SURVIVOR_DEPENDENCY_CHECKS'),
    ('EXPECTED_CONFINEMENT_DATE_REQUIRED','MATERNITY_CHECKS'),
    ('CONFINEMENT_DATE_REQUIRED','MATERNITY_CHECKS'),
    ('NO_CONCURRENT_SICKNESS','MATERNITY_CHECKS')
)
UPDATE public.bn_rule_catalogue rc
SET rule_group_id = rg.id,
    rule_group_code = rg.group_code
FROM map m
JOIN public.bn_rule_group rg ON rg.group_code = m.group_code
WHERE rc.rule_code = m.rule_code
  AND (rc.rule_group_id IS NULL OR rc.rule_group_code IS DISTINCT FROM rg.group_code);

-- Backfill catalogue_rule_id on existing product eligibility rules linked by code
UPDATE public.bn_eligibility_rule er
SET catalogue_rule_id = rc.id
FROM public.bn_rule_catalogue rc
WHERE er.catalogue_rule_code = rc.rule_code
  AND er.catalogue_rule_id IS NULL;