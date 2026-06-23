
-- ============ Reference tables ============
CREATE TABLE IF NOT EXISTS public.lg_case_intake_source (
  code varchar(40) PRIMARY KEY,
  display_name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_case_intake_source TO authenticated;
GRANT ALL ON public.lg_case_intake_source TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_matter_type (
  code varchar(60) PRIMARY KEY,
  display_name text NOT NULL,
  description text,
  default_case_type_code varchar(80),
  default_primary_entity_type varchar(40),
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_matter_type TO authenticated;
GRANT ALL ON public.lg_matter_type TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_primary_entity_type (
  code varchar(40) PRIMARY KEY,
  display_name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_primary_entity_type TO authenticated;
GRANT ALL ON public.lg_primary_entity_type TO service_role;

-- ============ Intake table ============
CREATE TABLE IF NOT EXISTS public.lg_case_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_no text NOT NULL UNIQUE,
  country_code varchar(10) NOT NULL DEFAULT 'SKN',
  source_module varchar(40) NOT NULL,
  source_type varchar(60),
  source_record_id uuid,
  source_reference_no text,
  matter_type_code varchar(60) NOT NULL,
  recommended_case_type_code varchar(80),
  primary_entity_type varchar(40) NOT NULL,
  primary_entity_id uuid,
  legacy_primary_entity_name text,
  summary text,
  exposure_amount numeric(18,2),
  priority_code varchar(40) NOT NULL DEFAULT 'MEDIUM',
  intake_status varchar(40) NOT NULL DEFAULT 'PENDING_REVIEW',
  submitted_by varchar(50),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  recommended_stage_code varchar(80),
  recommended_workbasket_code varchar(80),
  recommended_team_code varchar(80),
  lg_case_id uuid REFERENCES public.lg_case(id) ON DELETE SET NULL,
  decision_reason text,
  info_request_notes text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_case_intake TO authenticated;
GRANT ALL ON public.lg_case_intake TO service_role;

CREATE INDEX IF NOT EXISTS idx_lg_intake_status ON public.lg_case_intake(intake_status);
CREATE INDEX IF NOT EXISTS idx_lg_intake_source ON public.lg_case_intake(source_module);
CREATE INDEX IF NOT EXISTS idx_lg_intake_entity ON public.lg_case_intake(primary_entity_type, primary_entity_id);
CREATE INDEX IF NOT EXISTS idx_lg_intake_case ON public.lg_case_intake(lg_case_id);
CREATE INDEX IF NOT EXISTS idx_lg_intake_matter_type ON public.lg_case_intake(matter_type_code);

-- ============ Intake audit ============
CREATE TABLE IF NOT EXISTS public.lg_case_intake_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.lg_case_intake(id) ON DELETE CASCADE,
  action varchar(40) NOT NULL,
  from_status varchar(40),
  to_status varchar(40),
  performed_by varchar(50),
  notes text,
  routing_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_case_intake_audit TO authenticated;
GRANT ALL ON public.lg_case_intake_audit TO service_role;
CREATE INDEX IF NOT EXISTS idx_lg_intake_audit_intake ON public.lg_case_intake_audit(intake_id);

-- ============ Extend lg_case ============
ALTER TABLE public.lg_case
  ADD COLUMN IF NOT EXISTS primary_entity_type varchar(40),
  ADD COLUMN IF NOT EXISTS primary_entity_id uuid,
  ADD COLUMN IF NOT EXISTS legacy_primary_entity_name text,
  ADD COLUMN IF NOT EXISTS source_intake_id uuid REFERENCES public.lg_case_intake(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_module varchar(40),
  ADD COLUMN IF NOT EXISTS source_record_id uuid;

CREATE INDEX IF NOT EXISTS idx_lg_case_primary_entity ON public.lg_case(primary_entity_type, primary_entity_id);
CREATE INDEX IF NOT EXISTS idx_lg_case_source_intake ON public.lg_case(source_intake_id);

-- ============ Updated_at trigger ============
CREATE OR REPLACE FUNCTION public.lg_case_intake_touch() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;$$;

DROP TRIGGER IF EXISTS lg_case_intake_touch_t ON public.lg_case_intake;
CREATE TRIGGER lg_case_intake_touch_t BEFORE UPDATE ON public.lg_case_intake
  FOR EACH ROW EXECUTE FUNCTION public.lg_case_intake_touch();

-- ============ Seed reference data ============
INSERT INTO public.lg_case_intake_source(code,display_name,description,sort_order) VALUES
 ('COMPLIANCE','Compliance','Compliance enforcement referrals',10),
 ('BENEFITS','Benefits','Benefit decisions and disputes',20),
 ('CLAIMS','Claims','Claim adjudication referrals',30),
 ('EMPLOYER_SERVICES','Employer Services','Employer registration/account issues',40),
 ('INSURED_PERSON_SERVICES','Insured Person Services','Insured person matters',50),
 ('LEGAL_DIRECT','Legal Direct','Direct legal intake',60),
 ('COURT_EXTERNAL','Court / External','External court or third-party referral',70),
 ('INTERNAL_ADMIN','Internal Admin','Internal legal advice / admin',80),
 ('LEGACY_MIGRATION','Legacy Migration','Migrated legacy matters',90)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.lg_primary_entity_type(code,display_name,sort_order) VALUES
 ('EMPLOYER','Employer',10),
 ('INSURED_PERSON','Insured Person',20),
 ('CLAIM','Benefit Claim',30),
 ('BENEFICIARY','Beneficiary',40),
 ('PAYMENT_ARRANGEMENT','Payment Arrangement',50),
 ('COMPLIANCE_CASE','Compliance Case',60),
 ('COURT_CASE','Court Case',70),
 ('VENDOR','Vendor',80),
 ('INTERNAL_DEPARTMENT','Internal Department',90),
 ('ESTATE','Estate',100),
 ('LEGACY_EXTERNAL','Legacy / External',110)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.lg_matter_type(code,display_name,default_case_type_code,default_primary_entity_type,sort_order) VALUES
 ('CONTRIBUTION_RECOVERY','Contribution Recovery','CONTRIBUTION_RECOVERY','EMPLOYER',10),
 ('FAILURE_TO_REGISTER','Failure to Register','FAILURE_TO_REGISTER','EMPLOYER',20),
 ('PAYMENT_ARRANGEMENT_DEFAULT','Payment Arrangement Default','PAYMENT_ARRANGEMENT_DEFAULT','PAYMENT_ARRANGEMENT',30),
 ('BENEFIT_APPEAL','Benefit Claim Appeal','BENEFIT_APPEAL','CLAIM',40),
 ('OVERPAYMENT_RECOVERY','Overpayment Recovery','OVERPAYMENT_RECOVERY','INSURED_PERSON',50),
 ('FRAUD_MISREPRESENTATION','Fraud / Misrepresentation','FRAUD','INSURED_PERSON',60),
 ('ESTATE_RECOVERY','Estate Recovery','ESTATE_RECOVERY','ESTATE',70),
 ('COURT_MATTER','External Court Matter','COURT_MATTER','COURT_CASE',80),
 ('INTERNAL_LEGAL_ADVICE','Internal Legal Advice','INTERNAL_ADVICE','INTERNAL_DEPARTMENT',90),
 ('CONTRACT_PROCUREMENT','Contract / Procurement','CONTRACT','VENDOR',100)
ON CONFLICT (code) DO NOTHING;

-- Intake number sequence helper
CREATE SEQUENCE IF NOT EXISTS public.lg_case_intake_seq START 1000;
