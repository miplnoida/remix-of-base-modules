
-- 1. Extend bn_formula_template
ALTER TABLE public.bn_formula_template
  ADD COLUMN IF NOT EXISTS category VARCHAR(60),
  ADD COLUMN IF NOT EXISTS output_variable VARCHAR(80),
  ADD COLUMN IF NOT EXISTS required_variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS variable_source_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS default_sample_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rounding_rule VARCHAR(20) DEFAULT 'ROUND_HALF_UP',
  ADD COLUMN IF NOT EXISTS frequency VARCHAR(20) DEFAULT 'PER_CALCULATION',
  ADD COLUMN IF NOT EXISTS effective_from DATE,
  ADD COLUMN IF NOT EXISTS effective_to DATE,
  ADD COLUMN IF NOT EXISTS governance_status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS legal_reference TEXT,
  ADD COLUMN IF NOT EXISTS product_usage_examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS modified_by VARCHAR(50),
  ADD COLUMN IF NOT EXISTS modified_at TIMESTAMPTZ;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='bn_formula_template_governance_status_chk') THEN
    ALTER TABLE public.bn_formula_template
      ADD CONSTRAINT bn_formula_template_governance_status_chk
      CHECK (governance_status IN ('DRAFT','TECHNICAL_REVIEW','LEGAL_REVIEW','READY_FOR_PRODUCT_USE','ACTIVE','RETIRED'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='bn_formula_template_rounding_chk') THEN
    ALTER TABLE public.bn_formula_template
      ADD CONSTRAINT bn_formula_template_rounding_chk
      CHECK (rounding_rule IN ('ROUND_HALF_UP','ROUND_HALF_EVEN','FLOOR','CEILING','TRUNCATE','NONE'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bn_formula_template_category ON public.bn_formula_template(category);
CREATE INDEX IF NOT EXISTS idx_bn_formula_template_status ON public.bn_formula_template(governance_status);

-- 2. Variable registry
CREATE TABLE IF NOT EXISTS public.bn_formula_variable_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variable_code VARCHAR(80) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  description TEXT,
  category VARCHAR(60),
  source_type VARCHAR(40) NOT NULL,
  source_path VARCHAR(200),
  resolver_function VARCHAR(120),
  data_type VARCHAR(30) NOT NULL DEFAULT 'NUMBER',
  unit VARCHAR(30),
  allowed_operators JSONB NOT NULL DEFAULT '["+","-","*","/","min","max","floor"]'::jsonb,
  sample_value NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bn_formula_variable_source_type_chk CHECK (
    source_type IN ('FACT','DERIVED_FACT','PRODUCT_PARAMETER','FORMULA_RESULT','BENEFICIARY_RULE','AWARD_FACT','CONSTANT')
  ),
  CONSTRAINT bn_formula_variable_data_type_chk CHECK (
    data_type IN ('NUMBER','PERCENT','CURRENCY','INTEGER','DAYS','WEEKS','MONTHS','YEARS')
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_formula_variable_registry TO authenticated;
GRANT ALL ON public.bn_formula_variable_registry TO service_role;

CREATE INDEX IF NOT EXISTS idx_bn_formula_var_category ON public.bn_formula_variable_registry(category);
CREATE INDEX IF NOT EXISTS idx_bn_formula_var_source_type ON public.bn_formula_variable_registry(source_type);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.bn_formula_variable_set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_bn_formula_variable_updated_at ON public.bn_formula_variable_registry;
CREATE TRIGGER trg_bn_formula_variable_updated_at BEFORE UPDATE ON public.bn_formula_variable_registry
  FOR EACH ROW EXECUTE FUNCTION public.bn_formula_variable_set_updated_at();
