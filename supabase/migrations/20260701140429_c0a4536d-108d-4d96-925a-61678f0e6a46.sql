
INSERT INTO public.core_number_sequence
  (module_code, entity_type, country_code, number_pattern, separator, padding_length, current_number, reset_frequency, is_active, description)
VALUES
  ('CORE', 'TEMPLATE',           'SKN', 'TPL-{DEPARTMENT}-{SEQ}', '-', 4, 0, 'NEVER', TRUE, 'Auto-code for core_template.code'),
  ('CORE', 'TEMPLATE_CATEGORY',  'SKN', 'TCAT-{SEQ}',             '-', 4, 0, 'NEVER', TRUE, 'Auto-code for core_template_category.code'),
  ('CORE', 'TEMPLATE_TOKEN',     'SKN', 'TTOK-{DEPARTMENT}-{SEQ}','-', 4, 0, 'NEVER', TRUE, 'Auto-code for core_template_token.token_code'),
  ('CORE', 'TEMPLATE_CHANNEL',   'SKN', 'CH-{SEQ}',               '-', 4, 0, 'NEVER', TRUE, 'Auto-code for core_template_channel.code'),
  ('CORE', 'TEMPLATE_LAYOUT',    'SKN', 'TLAY-{SEQ}',             '-', 4, 0, 'NEVER', TRUE, 'Auto-code for core_template_layout.code'),
  ('CORE', 'LETTERHEAD',         'SKN', 'LH-{DEPARTMENT}-{SEQ}',  '-', 4, 0, 'NEVER', TRUE, 'Auto-code for comm_letterhead.code'),
  ('CORE', 'MEDIA_ASSET',        'SKN', 'MA-{DEPARTMENT}-{SEQ}',  '-', 4, 0, 'NEVER', TRUE, 'Auto-code for comm_media_asset.asset_code'),
  ('LEGAL','STAGE',              'SKN', 'LGS-{SEQ}',              '-', 4, 0, 'NEVER', TRUE, 'Auto-code for lg_case_source_stage.stage_code'),
  ('LEGAL','FEE_RULE',           'SKN', 'FEE-{SEQ}',              '-', 4, 0, 'NEVER', TRUE, 'Auto-code for lg_fee_rule.fee_rule_code'),
  ('LEGAL','FEE_WAIVER',         'SKN', 'FWP-{SEQ}',              '-', 4, 0, 'NEVER', TRUE, 'Auto-code for lg_fee_waiver_policy.policy_code')
ON CONFLICT DO NOTHING;

-- Add legacy_code column on each target for the future re-stamp pass.
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'core_template','core_template_category','core_template_token','core_template_channel',
    'core_template_layout','comm_letterhead','comm_media_asset','lg_case_source_stage',
    'lg_fee_rule','lg_fee_waiver_policy'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS legacy_code TEXT', tbl);
  END LOOP;
END $$;
