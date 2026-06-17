
-- Phase 1: BN Calculation Engine — Medical Tariff Engine schema + extensions

-- Extend bn_formula_version with MEDICAL_TARIFF_LOOKUP expression type
ALTER TABLE public.bn_formula_version DROP CONSTRAINT IF EXISTS bn_formula_version_expression_type_check;
ALTER TABLE public.bn_formula_version ADD CONSTRAINT bn_formula_version_expression_type_check
  CHECK (expression_type IN ('SIMPLE_EXPRESSION','RATE_TABLE_LOOKUP','MATRIX_LOOKUP','MEDICAL_TARIFF_LOOKUP','MULTI_STEP','CONDITIONAL'));

-- Extend bn_medical_procedure
ALTER TABLE public.bn_medical_procedure
  ADD COLUMN IF NOT EXISTS treatment_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS procedure_category VARCHAR(100);

-- ============================================================
-- bn_medical_location_type
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bn_medical_location_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_code VARCHAR(40) NOT NULL UNIQUE,
  location_name VARCHAR(120) NOT NULL,
  priority_order INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_medical_location_type TO authenticated;
GRANT ALL ON public.bn_medical_location_type TO service_role;

-- ============================================================
-- bn_medical_provider_type
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bn_medical_provider_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type_code VARCHAR(40) NOT NULL UNIQUE,
  provider_type_name VARCHAR(120) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_medical_provider_type TO authenticated;
GRANT ALL ON public.bn_medical_provider_type TO service_role;

-- ============================================================
-- bn_medical_tariff_table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bn_medical_tariff_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tariff_code VARCHAR(60) NOT NULL,
  tariff_name VARCHAR(200) NOT NULL,
  country_code VARCHAR(10) NOT NULL,
  version_no INTEGER NOT NULL DEFAULT 1,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  legal_reference TEXT,
  notes TEXT,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tariff_code, version_no, country_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_medical_tariff_table TO authenticated;
GRANT ALL ON public.bn_medical_tariff_table TO service_role;

-- ============================================================
-- bn_medical_tariff_row
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bn_medical_tariff_row (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tariff_table_id UUID NOT NULL REFERENCES public.bn_medical_tariff_table(id) ON DELETE CASCADE,
  procedure_code VARCHAR(60) NOT NULL,
  procedure_category VARCHAR(100),
  treatment_type VARCHAR(30),
  location_code VARCHAR(40) NOT NULL,
  provider_type_code VARCHAR(40) NOT NULL,
  beneficiary_type VARCHAR(40),
  referral_required BOOLEAN NOT NULL DEFAULT false,
  emergency_allowed BOOLEAN NOT NULL DEFAULT true,
  pre_authorization_required BOOLEAN NOT NULL DEFAULT false,
  reimbursement_method VARCHAR(40) NOT NULL CHECK (reimbursement_method IN
    ('FIXED_AMOUNT','PERCENTAGE_UP_TO_CEILING','ACTUAL_UP_TO_CEILING','FULL_REIMBURSEMENT','NOT_COVERED')),
  percentage_rate NUMERIC(7,4),
  fixed_amount NUMERIC(14,2),
  ceiling_amount NUMERIC(14,2),
  currency_code VARCHAR(10) NOT NULL DEFAULT 'XCD',
  approval_level VARCHAR(30) NOT NULL DEFAULT 'NONE' CHECK (approval_level IN
    ('NONE','MEDICAL_OFFICER','MEDICAL_BOARD','MANAGER','DIRECTOR')),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  notes TEXT,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bn_med_tariff_row_lookup
  ON public.bn_medical_tariff_row (procedure_code, location_code, provider_type_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_medical_tariff_row TO authenticated;
GRANT ALL ON public.bn_medical_tariff_row TO service_role;

-- ============================================================
-- bn_medical_authorization_rule
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bn_medical_authorization_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_code VARCHAR(60) NOT NULL,
  location_code VARCHAR(40) NOT NULL,
  provider_type_code VARCHAR(40),
  requires_referral BOOLEAN NOT NULL DEFAULT false,
  requires_medical_board BOOLEAN NOT NULL DEFAULT false,
  requires_overseas_approval BOOLEAN NOT NULL DEFAULT false,
  requires_ceo_or_director_approval BOOLEAN NOT NULL DEFAULT false,
  emergency_exception_allowed BOOLEAN NOT NULL DEFAULT true,
  required_documents_json JSONB DEFAULT '[]'::jsonb,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bn_med_auth_rule_lookup
  ON public.bn_medical_authorization_rule (procedure_code, location_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_medical_authorization_rule TO authenticated;
GRANT ALL ON public.bn_medical_authorization_rule TO service_role;

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION public.bn_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$ DECLARE t TEXT; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'bn_medical_location_type','bn_medical_provider_type',
    'bn_medical_tariff_table','bn_medical_tariff_row','bn_medical_authorization_rule'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bn_set_updated_at()', t, t);
  END LOOP;
END $$;
