
-- 1) New enum for participant roles
DO $$ BEGIN
  CREATE TYPE public.bn_participant_role AS ENUM (
    'APPLICANT','CLAIMANT','INSURED_PERSON','DECEASED_INSURED_PERSON',
    'BENEFICIARY','PAYEE','GUARDIAN','REPRESENTATIVE',
    'EMPLOYER','DOCTOR','MEDICAL_PROVIDER','SCHOOL','FUNERAL_HOME'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.bn_participant_verification_status AS ENUM ('UNVERIFIED','VERIFIED','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Extend bn_claim_participant (keep legacy kind for back-compat)
ALTER TABLE public.bn_claim_participant
  ADD COLUMN IF NOT EXISTS participant_role public.bn_participant_role,
  ADD COLUMN IF NOT EXISTS participant_type TEXT,
  ADD COLUMN IF NOT EXISTS relationship_to_insured TEXT,
  ADD COLUMN IF NOT EXISTS verification_status public.bn_participant_verification_status NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS external_ref TEXT,
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_primary_applicant BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_bn_claim_participant_role
  ON public.bn_claim_participant (claim_id, participant_role);

-- Backfill participant_role from legacy kind where possible
UPDATE public.bn_claim_participant
   SET participant_role = CASE kind
     WHEN 'CLAIMANT' THEN 'CLAIMANT'::public.bn_participant_role
     WHEN 'EMPLOYER' THEN 'EMPLOYER'::public.bn_participant_role
     WHEN 'DOCTOR'   THEN 'DOCTOR'::public.bn_participant_role
     ELSE NULL
   END
 WHERE participant_role IS NULL;

-- 3) New: per-product-version participant/public-form configuration
CREATE TABLE IF NOT EXISTS public.bn_product_participant_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_version_id UUID NOT NULL REFERENCES public.bn_product_version(id) ON DELETE CASCADE,
  applicant_must_equal_insured BOOLEAN NOT NULL DEFAULT true,
  allowed_applicant_kinds public.bn_participant_role[] NOT NULL DEFAULT ARRAY['APPLICANT']::public.bn_participant_role[],
  required_roles public.bn_participant_role[] NOT NULL DEFAULT '{}'::public.bn_participant_role[],
  optional_roles public.bn_participant_role[] NOT NULL DEFAULT '{}'::public.bn_participant_role[],
  requires_deceased BOOLEAN NOT NULL DEFAULT false,
  requires_beneficiaries BOOLEAN NOT NULL DEFAULT false,
  requires_guardian_or_payee BOOLEAN NOT NULL DEFAULT false,
  requires_employer_task BOOLEAN NOT NULL DEFAULT false,
  requires_doctor_task BOOLEAN NOT NULL DEFAULT false,
  requires_school_task_when JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bn_product_participant_config_version_uk UNIQUE (product_version_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_product_participant_config TO authenticated;
GRANT ALL ON public.bn_product_participant_config TO service_role;
-- Public read so the public portal renderer can fetch via anon key:
GRANT SELECT ON public.bn_product_participant_config TO anon;

-- Per project rule (Entry 9): NO RLS — role-based security only.
ALTER TABLE public.bn_product_participant_config DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.bn_ppc_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_bn_ppc_updated_at ON public.bn_product_participant_config;
CREATE TRIGGER trg_bn_ppc_updated_at
  BEFORE UPDATE ON public.bn_product_participant_config
  FOR EACH ROW EXECUTE FUNCTION public.bn_ppc_set_updated_at();
