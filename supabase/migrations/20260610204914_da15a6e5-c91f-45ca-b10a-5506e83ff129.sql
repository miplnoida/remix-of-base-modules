-- Align SKN product_version.formula_parameter_values with the renamed
-- variables in bn_formula_template.formula_expression. Idempotent: each
-- statement targets a known ACTIVE version_id and only updates rows that
-- already exist.

-- Sickness — PCT-AVG-WAGE expects `replacement_rate`
UPDATE public.bn_product_version
   SET formula_parameter_values = '{"replacement_rate": 0.65}'::jsonb,
       rounding_rule = '{"mode":"HALF_UP","decimals":2}'::jsonb,
       cap_rules = '{"min_weekly": 0, "max_weekly": 1300}'::jsonb,
       description = COALESCE(description,'') || ' [SEED-FORMULA]',
       modified_at = now()
 WHERE id = '6a7dc4f9-4588-4a16-81b4-325eada00c36';

-- Maternity — MATERNITY-RATE has the 65% baked in; no params required
UPDATE public.bn_product_version
   SET formula_parameter_values = '{}'::jsonb,
       rounding_rule = '{"mode":"HALF_UP","decimals":2}'::jsonb,
       description = COALESCE(description,'') || ' [SEED-FORMULA]',
       modified_at = now()
 WHERE id = 'aa100001-6666-4000-a000-000000000006';

-- Funeral — FUNERAL-GRANT requires `grant_amount`
UPDATE public.bn_product_version
   SET formula_parameter_values = '{"grant_amount": 2500}'::jsonb,
       rounding_rule = '{"mode":"HALF_UP","decimals":2}'::jsonb,
       description = COALESCE(description,'') || ' [SEED-FORMULA]',
       modified_at = now()
 WHERE id = 'aa100001-6666-4000-a000-000000000007';

-- Age Pension — TIERED-PENSION requires base_rate, base_weeks, increment_rate, increment_unit_size
UPDATE public.bn_product_version
   SET formula_parameter_values = '{"base_rate": 0.30, "base_weeks": 500, "increment_rate": 0.01, "increment_unit_size": 50}'::jsonb,
       rounding_rule = '{"mode":"HALF_UP","decimals":2}'::jsonb,
       cap_rules = '{"max_rate_pct": 0.60}'::jsonb,
       description = COALESCE(description,'') || ' [SEED-FORMULA]',
       modified_at = now()
 WHERE id = 'aa100001-6666-4000-a000-000000000009';

-- Invalidity — same TIERED-PENSION binding
UPDATE public.bn_product_version
   SET formula_parameter_values = '{"base_rate": 0.30, "base_weeks": 500, "increment_rate": 0.01, "increment_unit_size": 50}'::jsonb,
       rounding_rule = '{"mode":"HALF_UP","decimals":2}'::jsonb,
       cap_rules = '{"max_rate_pct": 0.60}'::jsonb,
       description = COALESCE(description,'') || ' [SEED-FORMULA]',
       modified_at = now()
 WHERE id = 'aa100001-6666-4000-a000-000000000008';

-- Survivors — SURVIVOR-SPLIT expects `beneficiary_share_percent`
UPDATE public.bn_product_version
   SET formula_parameter_values = '{"beneficiary_share_percent": 0.50}'::jsonb,
       rounding_rule = '{"mode":"HALF_UP","decimals":2}'::jsonb,
       description = COALESCE(description,'') || ' [SEED-FORMULA]',
       modified_at = now()
 WHERE id = 'aa100001-6666-4000-a000-000000000010';

-- EI Disablement — EI-DISABLEMENT expects `replacement_rate` (disablement_percentage is a Fact)
UPDATE public.bn_product_version
   SET formula_parameter_values = '{"replacement_rate": 0.75}'::jsonb,
       rounding_rule = '{"mode":"HALF_UP","decimals":2}'::jsonb,
       description = COALESCE(description,'') || ' [SEED-FORMULA]',
       modified_at = now()
 WHERE id = 'aa100001-6666-4000-a000-000000000003';

-- EI Death — SURVIVOR-SPLIT
UPDATE public.bn_product_version
   SET formula_parameter_values = '{"beneficiary_share_percent": 0.50}'::jsonb,
       rounding_rule = '{"mode":"HALF_UP","decimals":2}'::jsonb,
       description = COALESCE(description,'') || ' [SEED-FORMULA]',
       modified_at = now()
 WHERE id = 'aa100001-6666-4000-a000-000000000005';

-- Medical reimbursement — FLAT-GRANT (flat_amount cap)
UPDATE public.bn_product_version
   SET formula_parameter_values = '{"flat_amount": 1500}'::jsonb,
       rounding_rule = '{"mode":"HALF_UP","decimals":2}'::jsonb,
       description = COALESCE(description,'') || ' [SEED-FORMULA]',
       modified_at = now()
 WHERE id = 'aa100001-6666-4000-a000-000000000004';

-- NCP — NCP-FLAT-RATE
UPDATE public.bn_product_version
   SET formula_parameter_values = '{"flat_weekly_rate": 250}'::jsonb,
       rounding_rule = '{"mode":"HALF_UP","decimals":2}'::jsonb,
       description = COALESCE(description,'') || ' [SEED-FORMULA]',
       modified_at = now()
 WHERE id = 'aa100001-6666-4000-a000-000000000011';

-- Employment Injury (Temporary) — bind to SHORT_TERM_WITH_WAITING_DAYS
-- daily_rate * max(approved_days - waiting_days, 0)
UPDATE public.bn_product_version
   SET formula_template_id = 'c76c5cc3-459c-4a5d-9442-7ad6651c33ee',
       formula_parameter_values = '{"waiting_days": 3}'::jsonb,
       rounding_rule = '{"mode":"HALF_UP","decimals":2}'::jsonb,
       description = COALESCE(description,'') || ' [SEED-FORMULA]',
       modified_at = now()
 WHERE id = '24f7a90e-04a6-4c85-9a60-1e71e3ce3106';

-- Mark legacy column as deprecated by clearing it on the seeded ACTIVE rows.
UPDATE public.bn_product_version
   SET calculation_config_legacy = NULL
 WHERE id IN (
   '6a7dc4f9-4588-4a16-81b4-325eada00c36',
   'aa100001-6666-4000-a000-000000000006',
   'aa100001-6666-4000-a000-000000000007',
   'aa100001-6666-4000-a000-000000000009',
   'aa100001-6666-4000-a000-000000000008',
   'aa100001-6666-4000-a000-000000000010',
   'aa100001-6666-4000-a000-000000000003',
   'aa100001-6666-4000-a000-000000000005',
   'aa100001-6666-4000-a000-000000000004',
   'aa100001-6666-4000-a000-000000000011',
   '24f7a90e-04a6-4c85-9a60-1e71e3ce3106'
 );
