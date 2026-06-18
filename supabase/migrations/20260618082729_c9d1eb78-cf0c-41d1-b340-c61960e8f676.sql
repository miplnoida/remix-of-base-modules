-- BN Reference Data master tables
CREATE TABLE IF NOT EXISTS public.bn_reference_group (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code text NOT NULL UNIQUE,
  group_name text NOT NULL,
  module_code text NOT NULL DEFAULT 'BN',
  description text,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_reference_group TO authenticated;
GRANT SELECT ON public.bn_reference_group TO anon;
GRANT ALL ON public.bn_reference_group TO service_role;

CREATE TABLE IF NOT EXISTS public.bn_reference_value (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.bn_reference_group(id) ON DELETE CASCADE,
  value_code text NOT NULL,
  value_label text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  effective_from date,
  effective_to date,
  metadata_json jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, value_code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_reference_value TO authenticated;
GRANT SELECT ON public.bn_reference_value TO anon;
GRANT ALL ON public.bn_reference_value TO service_role;

CREATE INDEX IF NOT EXISTS idx_bn_ref_value_group ON public.bn_reference_value(group_id, is_active, sort_order);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.bn_reference_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_bn_ref_group_touch ON public.bn_reference_group;
CREATE TRIGGER trg_bn_ref_group_touch BEFORE UPDATE ON public.bn_reference_group
  FOR EACH ROW EXECUTE FUNCTION public.bn_reference_touch_updated_at();

DROP TRIGGER IF EXISTS trg_bn_ref_value_touch ON public.bn_reference_value;
CREATE TRIGGER trg_bn_ref_value_touch BEFORE UPDATE ON public.bn_reference_value
  FOR EACH ROW EXECUTE FUNCTION public.bn_reference_touch_updated_at();

-- Seed groups + values
DO $$
DECLARE
  g_id uuid;
  seed_data jsonb := '[
    {"code":"BN_RATE_TABLE_TYPE","name":"Rate Table Type","values":[
      ["TIER","Tier Table"],["RATE_TABLE","Rate Table"],["MATRIX","Matrix Table"],
      ["CAP_TABLE","Cap Table"],["SHARE_TABLE","Share Table"],["CONDITION_TABLE","Condition Table"]]},
    {"code":"BN_LOOKUP_MODE","name":"Lookup Mode","values":[
      ["SINGLE","Single Dimension"],["COMPOSITE","Composite (Multiple Dimensions)"]]},
    {"code":"BN_DIMENSION_TYPE","name":"Dimension Data Type","values":[
      ["NUMBER","Number"],["AMOUNT","Amount / Money"],["PERCENT","Percent"],
      ["DATE","Date"],["TEXT","Text"],["ENUM","Enumerated Value"],["BOOLEAN","Yes / No"]]},
    {"code":"BN_MATCH_TYPE","name":"Match Type","values":[
      ["RANGE","Range (min/max)"],["EXACT","Exact Match"],["IN","In List"]]},
    {"code":"BN_FORMULA_EXPRESSION_TYPE","name":"Formula Expression Type","values":[
      ["SIMPLE_EXPRESSION","Simple Expression"],["RATE_TABLE_LOOKUP","Rate Table Lookup"],
      ["MATRIX_LOOKUP","Matrix Lookup"],["MEDICAL_TARIFF_LOOKUP","Medical Tariff Lookup"],
      ["MULTI_STEP","Multi-Step"],["CONDITIONAL","Conditional"]]},
    {"code":"BN_FORMULA_STATUS","name":"Formula Status","values":[
      ["DRAFT","Draft"],["IN_REVIEW","In Review"],["ACTIVE","Active"],["RETIRED","Retired"]]},
    {"code":"BN_OUTPUT_TYPE","name":"Output Type","values":[
      ["NUMBER","Number"],["MONEY","Money / Amount"],["PERCENT","Percent"],
      ["BOOLEAN","Yes / No"],["TEXT","Text"]]},
    {"code":"BN_REIMBURSEMENT_METHOD","name":"Reimbursement Method","values":[
      ["FIXED_AMOUNT","Fixed Amount"],["PERCENTAGE_UP_TO_CEILING","Percentage up to Ceiling"],
      ["ACTUAL_UP_TO_CEILING","Actual up to Ceiling"],["FULL_REIMBURSEMENT","Full Reimbursement"],
      ["NOT_COVERED","Not Covered"]]},
    {"code":"BN_MEDICAL_LOCATION_TYPE","name":"Medical Location Type","values":[
      ["LOCAL_SK","Local (St. Kitts & Nevis)"],["CARIBBEAN","Caribbean / Regional"],["INTERNATIONAL","International"]]},
    {"code":"BN_MEDICAL_PROVIDER_TYPE","name":"Medical Provider Type","values":[
      ["PUBLIC","Public Facility"],["PRIVATE","Private Facility"],["OVERSEAS","Overseas Facility"],
      ["APPROVED_NETWORK","Approved Network Provider"],["NON_NETWORK","Non-Network Provider"]]}
  ]'::jsonb;
  grp jsonb;
  v jsonb;
  i int;
BEGIN
  FOR grp IN SELECT * FROM jsonb_array_elements(seed_data) LOOP
    INSERT INTO public.bn_reference_group(group_code, group_name, module_code, is_system, is_active)
    VALUES (grp->>'code', grp->>'name', 'BN', true, true)
    ON CONFLICT (group_code) DO UPDATE SET group_name = EXCLUDED.group_name, is_system = true
    RETURNING id INTO g_id;

    i := 0;
    FOR v IN SELECT * FROM jsonb_array_elements(grp->'values') LOOP
      INSERT INTO public.bn_reference_value(group_id, value_code, value_label, sort_order, is_system, is_active)
      VALUES (g_id, v->>0, v->>1, i, true, true)
      ON CONFLICT (group_id, value_code) DO UPDATE
        SET value_label = EXCLUDED.value_label, sort_order = EXCLUDED.sort_order, is_system = true;
      i := i + 1;
    END LOOP;
  END LOOP;
END $$;