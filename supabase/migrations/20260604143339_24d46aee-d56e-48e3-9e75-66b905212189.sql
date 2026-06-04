CREATE TABLE IF NOT EXISTS public.bn_product_test_case (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NULL,
  product_version_id UUID NULL,
  test_case_code TEXT NOT NULL,
  test_case_name TEXT NOT NULL,
  scenario_type TEXT NOT NULL CHECK (scenario_type IN ('POSITIVE','NEGATIVE','BOUNDARY','LEGACY_COMPARISON')),
  input_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  expected_result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  entered_by VARCHAR(50) NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(50) NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_product_test_case TO authenticated;
GRANT ALL ON public.bn_product_test_case TO service_role;
CREATE INDEX IF NOT EXISTS idx_bn_product_test_case_product ON public.bn_product_test_case(product_id);
CREATE INDEX IF NOT EXISTS idx_bn_product_test_case_version ON public.bn_product_test_case(product_version_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_bn_product_test_case_code ON public.bn_product_test_case(product_id, test_case_code);