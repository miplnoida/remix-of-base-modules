
ALTER TABLE public.bn_product_version
  ADD COLUMN IF NOT EXISTS formula_template_id uuid NULL REFERENCES public.bn_formula_template(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS formula_parameter_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cap_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rounding_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS effective_date_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS calculation_config_legacy jsonb NULL;

CREATE INDEX IF NOT EXISTS idx_bn_product_version_formula_template
  ON public.bn_product_version(formula_template_id);

COMMENT ON COLUMN public.bn_product_version.formula_template_id IS
  'Selected formula template from bn_formula_template. Replaces raw calculation_config JSON.';
COMMENT ON COLUMN public.bn_product_version.formula_parameter_values IS
  'Per-product values bound to the formula template variables, e.g. {"rate_pct":75,"min_weekly":50}.';
COMMENT ON COLUMN public.bn_product_version.cap_rules IS
  'Caps applied after formula evaluation, e.g. {"max_weekly":1500,"min_weekly":50,"family_cap_pct":100}.';
COMMENT ON COLUMN public.bn_product_version.rounding_rule IS
  'Rounding policy, e.g. {"mode":"HALF_UP","decimals":2}.';
COMMENT ON COLUMN public.bn_product_version.effective_date_rule IS
  'How the engine picks the effective rate snapshot, e.g. {"basis":"claim_date"}.';
COMMENT ON COLUMN public.bn_product_version.calculation_config_legacy IS
  'Snapshot of the previous calculation_config JSON, kept for audit and fallback.';
