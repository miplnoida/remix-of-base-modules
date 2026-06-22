
-- 1) Extend source configuration with classification + enforcement flags
ALTER TABLE public.lg_case_source_config
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'OPERATIONAL',
  ADD COLUMN IF NOT EXISTS enforce_case_type_restrictions boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enforce_stage_restrictions boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_historical_exceptions boolean NOT NULL DEFAULT false;

ALTER TABLE public.lg_case_source_config
  DROP CONSTRAINT IF EXISTS lg_case_source_config_source_type_chk;
ALTER TABLE public.lg_case_source_config
  ADD CONSTRAINT lg_case_source_config_source_type_chk
  CHECK (source_type IN ('OPERATIONAL','REFERRAL','EXTERNAL','LEGACY','MIGRATION'));

-- Classify existing rows by their source_code
UPDATE public.lg_case_source_config
SET source_type = CASE source_code
    WHEN 'COMPLIANCE_REFERRAL' THEN 'REFERRAL'
    WHEN 'COURT_FILED'         THEN 'EXTERNAL'
    WHEN 'LEGACY'              THEN 'LEGACY'
    WHEN 'MANUAL_EMPLOYER'     THEN 'OPERATIONAL'
    WHEN 'MANUAL_MEMBER'       THEN 'OPERATIONAL'
    WHEN 'INTERNAL'            THEN 'OPERATIONAL'
    ELSE source_type
  END,
  enforce_case_type_restrictions = CASE WHEN source_code IN ('LEGACY') THEN false ELSE true END,
  enforce_stage_restrictions     = CASE WHEN source_code IN ('LEGACY') THEN false ELSE true END,
  allow_historical_exceptions    = CASE WHEN source_code IN ('LEGACY') THEN true  ELSE false END
WHERE country_code = 'SKN';

-- 2) Model FEES_AND_WAIVERS as a real Legal-Finance stage (so it's no longer ambiguous).
INSERT INTO public.core_reference_value (group_id, value_code, value_label, sort_order, is_active, metadata_json, description)
SELECT id, 'FEES_AND_WAIVERS', 'Fees & Waivers', 95, true,
       '{"stage_domain":"LEGAL_FINANCE"}'::jsonb,
       'Legal fee posting / waiver stage'
FROM public.core_reference_group
WHERE group_code = 'LG_CASE_STAGE'
ON CONFLICT (group_id, value_code) DO UPDATE
  SET is_active = true,
      metadata_json = COALESCE(public.core_reference_value.metadata_json, '{}'::jsonb) || '{"stage_domain":"LEGAL_FINANCE"}'::jsonb;

-- Allow it for sources that can post fees (transition only)
INSERT INTO public.lg_case_source_stage
  (country_code, source_code, stage_code, allowed_as_initial_stage, allowed_as_transition_stage, is_active)
VALUES
  ('SKN','COMPLIANCE_REFERRAL','FEES_AND_WAIVERS', false, true, true),
  ('SKN','MANUAL_EMPLOYER',    'FEES_AND_WAIVERS', false, true, true),
  ('SKN','MANUAL_MEMBER',      'FEES_AND_WAIVERS', false, true, true),
  ('SKN','LEGACY',             'FEES_AND_WAIVERS', false, true, true)
ON CONFLICT DO NOTHING;
