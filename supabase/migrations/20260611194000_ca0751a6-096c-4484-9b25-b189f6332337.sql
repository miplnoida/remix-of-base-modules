
CREATE OR REPLACE FUNCTION public.bn_calc_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- 1. bn_formula_version
CREATE TABLE public.bn_formula_version (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formula_template_id UUID NOT NULL REFERENCES public.bn_formula_template(id) ON DELETE CASCADE,
  formula_code VARCHAR(60) NOT NULL,
  version_no INTEGER NOT NULL DEFAULT 1,
  expression_type VARCHAR(30) NOT NULL
    CHECK (expression_type IN ('SIMPLE_EXPRESSION','RATE_TABLE_LOOKUP','MATRIX_LOOKUP','MULTI_STEP','CONDITIONAL')),
  expression TEXT,
  steps_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  output_variable VARCHAR(80),
  rounding_rule VARCHAR(30) DEFAULT 'ROUND_HALF_UP',
  governance_status VARCHAR(40) NOT NULL DEFAULT 'DRAFT'
    CHECK (governance_status IN ('DRAFT','TECHNICAL_REVIEW','LEGAL_REVIEW','READY_FOR_PRODUCT_USE','ACTIVE','RETIRED')),
  effective_from DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  entered_by VARCHAR(50),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(formula_template_id, version_no)
);
CREATE INDEX idx_bn_formula_version_code ON public.bn_formula_version(formula_code);
CREATE INDEX idx_bn_formula_version_active ON public.bn_formula_version(is_active, governance_status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_formula_version TO authenticated;
GRANT ALL ON public.bn_formula_version TO service_role;
ALTER TABLE public.bn_formula_version DISABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_bn_formula_version_updated BEFORE UPDATE ON public.bn_formula_version
  FOR EACH ROW EXECUTE FUNCTION public.bn_calc_set_updated_at();

-- 2. bn_rate_table
CREATE TABLE public.bn_rate_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_code VARCHAR(80) NOT NULL,
  table_name VARCHAR(200) NOT NULL,
  description TEXT,
  table_type VARCHAR(30) NOT NULL
    CHECK (table_type IN ('TIER','RATE_TABLE','MATRIX','FLAT','LOOKUP','CAP_TABLE','SHARE_TABLE','CONDITION_TABLE')),
  lookup_mode VARCHAR(20) NOT NULL DEFAULT 'RANGE_MATCH'
    CHECK (lookup_mode IN ('FIRST_MATCH','EXACT_MATCH','RANGE_MATCH','MATRIX_MATCH')),
  country_code VARCHAR(5) NOT NULL DEFAULT 'SKN',
  version_no INTEGER NOT NULL DEFAULT 1,
  effective_from DATE,
  effective_to DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','ACTIVE','RETIRED')),
  legal_reference TEXT,
  allow_gaps BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  entered_by VARCHAR(50),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(table_code, country_code, version_no)
);
CREATE INDEX idx_bn_rate_table_status ON public.bn_rate_table(status, country_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_rate_table TO authenticated;
GRANT ALL ON public.bn_rate_table TO service_role;
ALTER TABLE public.bn_rate_table DISABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_bn_rate_table_updated BEFORE UPDATE ON public.bn_rate_table
  FOR EACH ROW EXECUTE FUNCTION public.bn_calc_set_updated_at();

-- 3. bn_rate_table_dimension
CREATE TABLE public.bn_rate_table_dimension (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_table_id UUID NOT NULL REFERENCES public.bn_rate_table(id) ON DELETE CASCADE,
  dimension_key VARCHAR(60) NOT NULL,
  dimension_label VARCHAR(200) NOT NULL,
  dimension_type VARCHAR(20) NOT NULL DEFAULT 'NUMBER'
    CHECK (dimension_type IN ('NUMBER','DATE','TEXT','ENUM','BOOLEAN')),
  match_type VARCHAR(10) NOT NULL DEFAULT 'RANGE'
    CHECK (match_type IN ('RANGE','EXACT','IN')),
  sequence_no INTEGER NOT NULL DEFAULT 1,
  enum_values JSONB NOT NULL DEFAULT '[]'::jsonb,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rate_table_id, dimension_key)
);
CREATE INDEX idx_bn_rate_table_dimension_tbl ON public.bn_rate_table_dimension(rate_table_id, sequence_no);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_rate_table_dimension TO authenticated;
GRANT ALL ON public.bn_rate_table_dimension TO service_role;
ALTER TABLE public.bn_rate_table_dimension DISABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_bn_rate_table_dimension_updated BEFORE UPDATE ON public.bn_rate_table_dimension
  FOR EACH ROW EXECUTE FUNCTION public.bn_calc_set_updated_at();

-- 4. bn_rate_table_row
CREATE TABLE public.bn_rate_table_row (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_table_id UUID NOT NULL REFERENCES public.bn_rate_table(id) ON DELETE CASCADE,
  row_order INTEGER NOT NULL DEFAULT 1,
  dimension_values_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_key VARCHAR(80),
  output_value NUMERIC(18,6),
  output_text TEXT,
  output_type VARCHAR(20) NOT NULL DEFAULT 'AMOUNT'
    CHECK (output_type IN ('PERCENTAGE','AMOUNT','RATE','MULTIPLIER','FLAG','TEXT')),
  effective_from DATE,
  effective_to DATE,
  notes TEXT,
  entered_by VARCHAR(50),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bn_rate_table_row_tbl ON public.bn_rate_table_row(rate_table_id, row_order);
CREATE INDEX idx_bn_rate_table_row_dim ON public.bn_rate_table_row USING GIN (dimension_values_json);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_rate_table_row TO authenticated;
GRANT ALL ON public.bn_rate_table_row TO service_role;
ALTER TABLE public.bn_rate_table_row DISABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_bn_rate_table_row_updated BEFORE UPDATE ON public.bn_rate_table_row
  FOR EACH ROW EXECUTE FUNCTION public.bn_calc_set_updated_at();

CREATE OR REPLACE FUNCTION public.bn_rate_table_row_validate()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.effective_from IS NOT NULL AND NEW.effective_to IS NOT NULL
     AND NEW.effective_to < NEW.effective_from THEN
    RAISE EXCEPTION 'bn_rate_table_row: effective_to (%) must be on/after effective_from (%)',
      NEW.effective_to, NEW.effective_from;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_bn_rate_table_row_validate
  BEFORE INSERT OR UPDATE ON public.bn_rate_table_row
  FOR EACH ROW EXECUTE FUNCTION public.bn_rate_table_row_validate();

-- 5. bn_product_formula_binding
CREATE TABLE public.bn_product_formula_binding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID,
  product_version_id UUID,
  formula_template_id UUID NOT NULL REFERENCES public.bn_formula_template(id) ON DELETE RESTRICT,
  formula_version_id UUID REFERENCES public.bn_formula_version(id) ON DELETE SET NULL,
  calculation_stage VARCHAR(30) NOT NULL DEFAULT 'PRIMARY'
    CHECK (calculation_stage IN ('PRIMARY','CAP','ARREARS','PRORATION','BENEFICIARY_SPLIT','FINAL')),
  sequence_no INTEGER NOT NULL DEFAULT 1,
  output_variable VARCHAR(80),
  rounding_rule VARCHAR(30) DEFAULT 'ROUND_HALF_UP',
  cap_min NUMERIC(18,4),
  cap_max NUMERIC(18,4),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  entered_by VARCHAR(50),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bn_pfb_product ON public.bn_product_formula_binding(product_id, product_version_id);
CREATE INDEX idx_bn_pfb_stage ON public.bn_product_formula_binding(calculation_stage, sequence_no);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_product_formula_binding TO authenticated;
GRANT ALL ON public.bn_product_formula_binding TO service_role;
ALTER TABLE public.bn_product_formula_binding DISABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_bn_pfb_updated BEFORE UPDATE ON public.bn_product_formula_binding
  FOR EACH ROW EXECUTE FUNCTION public.bn_calc_set_updated_at();

-- 6. bn_product_formula_variable_mapping
CREATE TABLE public.bn_product_formula_variable_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  binding_id UUID NOT NULL REFERENCES public.bn_product_formula_binding(id) ON DELETE CASCADE,
  variable_name VARCHAR(80) NOT NULL,
  source_type VARCHAR(30) NOT NULL
    CHECK (source_type IN ('FACT','DERIVED_FACT','PRODUCT_PARAMETER','RATE_TABLE','MATRIX_TABLE','PRIOR_FORMULA_RESULT','CLAIM_FIELD','MANUAL_INPUT','CONSTANT')),
  source_key VARCHAR(200),
  rate_table_code VARCHAR(80),
  required BOOLEAN NOT NULL DEFAULT true,
  default_value TEXT,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(binding_id, variable_name)
);
CREATE INDEX idx_bn_pfvm_binding ON public.bn_product_formula_variable_mapping(binding_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_product_formula_variable_mapping TO authenticated;
GRANT ALL ON public.bn_product_formula_variable_mapping TO service_role;
ALTER TABLE public.bn_product_formula_variable_mapping DISABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_bn_pfvm_updated BEFORE UPDATE ON public.bn_product_formula_variable_mapping
  FOR EACH ROW EXECUTE FUNCTION public.bn_calc_set_updated_at();

-- 7. bn_calculation_trace
CREATE TABLE public.bn_calculation_trace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID,
  product_id UUID,
  product_version_id UUID,
  formula_binding_id UUID,
  formula_code VARCHAR(60),
  formula_version INTEGER,
  calculation_stage VARCHAR(30),
  sequence_no INTEGER,
  input_values_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  lookup_trace_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  expression_trace_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  result_value NUMERIC(18,6),
  rounded_value NUMERIC(18,4),
  status VARCHAR(20) NOT NULL DEFAULT 'OK'
    CHECK (status IN ('OK','WARNING','ERROR')),
  error_message TEXT,
  duration_ms INTEGER,
  run_mode VARCHAR(20) NOT NULL DEFAULT 'PRODUCTION'
    CHECK (run_mode IN ('PRODUCTION','SIMULATION','WHAT_IF')),
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bn_calc_trace_claim ON public.bn_calculation_trace(claim_id, created_at DESC);
CREATE INDEX idx_bn_calc_trace_product ON public.bn_calculation_trace(product_version_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_calculation_trace TO authenticated;
GRANT ALL ON public.bn_calculation_trace TO service_role;
ALTER TABLE public.bn_calculation_trace DISABLE ROW LEVEL SECURITY;
