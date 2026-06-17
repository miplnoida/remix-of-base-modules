ALTER TABLE public.bn_product_formula_binding
  ADD COLUMN IF NOT EXISTS step_mapping_json jsonb;

COMMENT ON COLUMN public.bn_product_formula_binding.step_mapping_json IS
  'Per-step variable/scope mapping when bound formula uses MULTI_STEP / LOOKUP / MEDICAL_TARIFF steps. Structure: { "<step_id>": { "kind": "LOOKUP"|"MEDICAL_TARIFF"|"EXPRESSION", "inputs": { "<dim_or_var>": { "source_type": "FACT|PARAM|...", "source_key": "..." } }, "output_variable": "...", "policy_scope": "..." } }';