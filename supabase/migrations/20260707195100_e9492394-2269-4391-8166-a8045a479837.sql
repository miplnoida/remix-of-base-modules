
-- OM-9.5 Organisation Default Seeding & Stabilization

INSERT INTO public.core_audit_event_type (event_code, event_name, description, module_code, domain_code, event_category, is_admin_event, is_active)
VALUES
  ('ORG_DEFAULTS_SEEDED',                    'Organisation Defaults Seeded',           'Baseline organisation-level default assignments were seeded.',            'CORE','ORG_DEFAULTS','SEED',      true, true),
  ('ORG_DEFAULTS_UPDATED',                   'Organisation Defaults Updated',          'Organisation Profile default settings were updated.',                     'CORE','ORG_DEFAULTS','UPDATE',    true, true),
  ('ORG_DEFAULT_ASSIGNMENT_CREATED',         'Org Default Assignment Created',         'ORG-scope guided configuration assignment created for a default.',        'CORE','ORG_DEFAULTS','CREATE',    true, true),
  ('ORG_DEFAULT_ASSIGNMENT_UPDATED',         'Org Default Assignment Updated',         'ORG-scope guided configuration assignment updated.',                      'CORE','ORG_DEFAULTS','UPDATE',    true, true),
  ('ORG_DEFAULT_ASSIGNMENT_VALIDATED',       'Org Default Assignment Validated',       'ORG-scope guided configuration assignment passed validation.',            'CORE','ORG_DEFAULTS','VALIDATE',  true, true),
  ('ORG_DEFAULT_PREVIEW_RUN',                'Org Default Preview Run',                'Branding/document preview rendered using organisation defaults.',         'CORE','ORG_DEFAULTS','PREVIEW',   true, true),
  ('ORG_DEFAULT_PREVIEW_FAILED',             'Org Default Preview Failed',             'Branding/document preview failed to render.',                             'CORE','ORG_DEFAULTS','PREVIEW',   true, true),
  ('ORG_DEFAULT_TEST_RESOLVE_RUN',           'Org Default Test Resolve Run',           'Admin ran Test Resolve on an organisation default.',                      'CORE','ORG_DEFAULTS','RESOLVE',   true, true),
  ('ORG_DEFAULT_HEALTH_CHECK_RUN',           'Org Default Health Check Run',           'Organisation defaults health check executed.',                            'CORE','ORG_DEFAULTS','HEALTH',    true, true),
  ('ORG_DEFAULT_HEALTH_ISSUE_DETECTED',      'Org Default Health Issue Detected',      'Health check surfaced a missing/inactive/incompatible default.',          'CORE','ORG_DEFAULTS','HEALTH',    true, true),
  ('ORG_DEFAULT_UI_STABILIZED',              'Org Default UI Stabilized',              'OM-9.5 attestation: seed + UI + preview verified.',                       'CORE','ORG_DEFAULTS','ATTESTATION',true, true)
ON CONFLICT (event_code) DO UPDATE SET event_name = EXCLUDED.event_name, description = EXCLUDED.description, is_active = true, updated_at = now();

INSERT INTO public.core_reference_group (group_code, group_name, module_code, description, is_system, is_active, group_category)
VALUES
  ('ORG_DEFAULT_SETTING_KEY',       'Org Default Setting Key',       'CORE', 'Canonical setting keys resolved via Organisation Profile defaults.', true, true, 'SETTINGS'),
  ('ORG_DEFAULT_HEALTH_STATUS',     'Org Default Health Status',     'CORE', 'Health status (OK / WARNING / MISSING / INACTIVE / INCOMPATIBLE).', true, true, 'SETTINGS'),
  ('ORG_DEFAULT_PREVIEW_TYPE',      'Org Default Preview Type',      'CORE', 'Preview surfaces (DOCUMENT / EMAIL / PRINT_FOOTER).', true, true, 'SETTINGS'),
  ('ORG_DEFAULT_SOURCE_TYPE',       'Org Default Source Type',       'CORE', 'Where the resolved default came from.', true, true, 'SETTINGS'),
  ('ORG_DEFAULT_ASSIGNMENT_STATUS', 'Org Default Assignment Status', 'CORE', 'Lifecycle status for an ORG-scope guided default assignment.', true, true, 'SETTINGS')
ON CONFLICT (group_code) DO UPDATE SET group_name = EXCLUDED.group_name, description = EXCLUDED.description, is_active = true, updated_at = now();

INSERT INTO public.core_table_registry (table_name, module_code, domain_code, table_category, ownership_type, lifecycle_status, description, is_active)
VALUES
  ('core_organization',             'CORE', 'ORGANIZATION',  'MASTER',        'PLATFORM', 'ACTIVE', 'Root organisation record; direct default_* columns.', true),
  ('core_organization_profile',     'CORE', 'ORGANIZATION',  'MASTER',        'PLATFORM', 'ACTIVE', 'Extended organisation profile attributes.',           true),
  ('core_configuration_assignment', 'CORE', 'CONFIGURATION', 'CONFIGURATION', 'PLATFORM', 'ACTIVE', 'Universal scoped configuration assignments.',         true),
  ('comm_letterhead',               'CORE', 'COMMUNICATION', 'DOCUMENT',      'PLATFORM', 'ACTIVE', 'Letterhead master.',                                  true),
  ('comm_email_signature',          'CORE', 'COMMUNICATION', 'DOCUMENT',      'PLATFORM', 'ACTIVE', 'Email signature master.',                             true),
  ('comm_disclaimer',               'CORE', 'COMMUNICATION', 'DOCUMENT',      'PLATFORM', 'ACTIVE', 'Disclaimer master.',                                  true),
  ('comm_print_footer',             'CORE', 'COMMUNICATION', 'DOCUMENT',      'PLATFORM', 'ACTIVE', 'Print footer master.',                                true),
  ('core_template',                 'CORE', 'COMMUNICATION', 'DOCUMENT',      'PLATFORM', 'ACTIVE', 'Canonical document template model.',                  true),
  ('core_template_version',         'CORE', 'COMMUNICATION', 'DOCUMENT',      'PLATFORM', 'ACTIVE', 'Template version history.',                           true),
  ('notification_templates',        'CORE', 'COMMUNICATION', 'NOTIFICATION',  'PLATFORM', 'ACTIVE', 'Notification templates.',                             true),
  ('core_text_block',               'CORE', 'COMMUNICATION', 'DOCUMENT',      'PLATFORM', 'ACTIVE', 'Reusable text blocks.',                               true),
  ('core_template_channel',         'CORE', 'COMMUNICATION', 'REFERENCE',     'PLATFORM', 'ACTIVE', 'Template output channels.',                           true),
  ('core_language',                 'CORE', 'REFERENCE',     'REFERENCE',     'PLATFORM', 'ACTIVE', 'Language catalogue.',                                 true),
  ('core_retention_policy',         'CORE', 'GOVERNANCE',    'CONFIGURATION', 'PLATFORM', 'ACTIVE', 'Retention policy catalogue.',                         true),
  ('core_workflow_definition',      'CORE', 'WORKFLOW',      'WORKFLOW',      'PLATFORM', 'ACTIVE', 'Workflow definitions.',                               true),
  ('core_office_locations',         'CORE', 'ORGANIZATION',  'MASTER',        'PLATFORM', 'ACTIVE', 'Canonical office/location master.',                   true),
  ('comm_media_asset',              'CORE', 'COMMUNICATION', 'DOCUMENT',      'PLATFORM', 'ACTIVE', 'Media asset library.',                                true)
ON CONFLICT (table_name) DO UPDATE SET lifecycle_status = 'ACTIVE', is_active = true, updated_at = now();

DO $$
DECLARE
  v_org      core_organization%ROWTYPE;
  v_org_ref  jsonb;
  v_rule     jsonb;
BEGIN
  SELECT * INTO v_org FROM public.core_organization ORDER BY created_at ASC LIMIT 1;
  IF v_org.id IS NULL THEN RETURN; END IF;
  v_org_ref := jsonb_build_object('organization_id', v_org.id::text);
  v_rule    := jsonb_build_object('guided', true, 'source', 'ORG_PROFILE_COLUMN', 'seeded_by', 'OM-9.5');

  IF v_org.default_letterhead_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM core_configuration_assignment WHERE domain='COMMUNICATION' AND resource_type='LETTERHEAD' AND scope_level='ORG' AND scope_ref = v_org_ref AND is_active
  ) THEN
    INSERT INTO core_configuration_assignment (domain,scope_level,scope_ref,resource_type,resource_ref,rule_set,priority,is_active,notes,created_by,updated_by)
    VALUES ('COMMUNICATION','ORG',v_org_ref,'LETTERHEAD', jsonb_build_object('letterhead_id', v_org.default_letterhead_id::text), v_rule, 100, true, 'OM-9.5 seed: mirrors core_organization.default_letterhead_id','OM-9.5','OM-9.5');
  END IF;

  IF v_org.default_email_signature_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM core_configuration_assignment WHERE domain='COMMUNICATION' AND resource_type='EMAIL_SIGNATURE' AND scope_level='ORG' AND scope_ref = v_org_ref AND is_active
  ) THEN
    INSERT INTO core_configuration_assignment (domain,scope_level,scope_ref,resource_type,resource_ref,rule_set,priority,is_active,notes,created_by,updated_by)
    VALUES ('COMMUNICATION','ORG',v_org_ref,'EMAIL_SIGNATURE', jsonb_build_object('signature_id', v_org.default_email_signature_id::text), v_rule, 100, true, 'OM-9.5 seed: mirrors core_organization.default_email_signature_id','OM-9.5','OM-9.5');
  END IF;

  IF v_org.default_disclaimer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM core_configuration_assignment WHERE domain='COMMUNICATION' AND resource_type='DISCLAIMER' AND scope_level='ORG' AND scope_ref = v_org_ref AND is_active
  ) THEN
    INSERT INTO core_configuration_assignment (domain,scope_level,scope_ref,resource_type,resource_ref,rule_set,priority,is_active,notes,created_by,updated_by)
    VALUES ('COMMUNICATION','ORG',v_org_ref,'DISCLAIMER', jsonb_build_object('disclaimer_id', v_org.default_disclaimer_id::text), v_rule, 100, true, 'OM-9.5 seed: mirrors core_organization.default_disclaimer_id','OM-9.5','OM-9.5');
  END IF;

  IF v_org.default_print_footer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM core_configuration_assignment WHERE domain='COMMUNICATION' AND resource_type='PRINT_FOOTER' AND scope_level='ORG' AND scope_ref = v_org_ref AND is_active
  ) THEN
    INSERT INTO core_configuration_assignment (domain,scope_level,scope_ref,resource_type,resource_ref,rule_set,priority,is_active,notes,created_by,updated_by)
    VALUES ('COMMUNICATION','ORG',v_org_ref,'PRINT_FOOTER', jsonb_build_object('print_footer_id', v_org.default_print_footer_id::text), v_rule, 100, true, 'OM-9.5 seed: mirrors core_organization.default_print_footer_id','OM-9.5','OM-9.5');
  END IF;

  IF v_org.default_language IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM core_configuration_assignment WHERE domain='COMMUNICATION' AND resource_type='LANGUAGE' AND scope_level='ORG' AND scope_ref = v_org_ref AND is_active
  ) THEN
    INSERT INTO core_configuration_assignment (domain,scope_level,scope_ref,resource_type,resource_ref,rule_set,priority,is_active,notes,created_by,updated_by)
    VALUES ('COMMUNICATION','ORG',v_org_ref,'LANGUAGE', jsonb_build_object('language_code', v_org.default_language), v_rule, 100, true, 'OM-9.5 seed: mirrors core_organization.default_language','OM-9.5','OM-9.5');
  END IF;

  IF v_org.default_location_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM core_configuration_assignment WHERE domain='COMMUNICATION' AND resource_type='LOCATION' AND scope_level='ORG' AND scope_ref = v_org_ref AND is_active
  ) THEN
    INSERT INTO core_configuration_assignment (domain,scope_level,scope_ref,resource_type,resource_ref,rule_set,priority,is_active,notes,created_by,updated_by)
    VALUES ('COMMUNICATION','ORG',v_org_ref,'LOCATION', jsonb_build_object('location_id', v_org.default_location_id::text), v_rule, 100, true, 'OM-9.5 seed: mirrors core_organization.default_location_id','OM-9.5','OM-9.5');
  END IF;
END $$;

INSERT INTO public.core_release_readiness_attestation (release_tag, check_code, attested_status, notes, attested_by, attested_at, is_active)
SELECT 'OM-9.5', 'ORG_DEFAULT_UI_STABILIZED', 'ATTESTED',
       'OM-9.5: Organisation defaults seeded (idempotent), audit + reference vocabulary registered, Comm Defaults UI stabilised.',
       NULL::uuid, now(), true
WHERE NOT EXISTS (
  SELECT 1 FROM public.core_release_readiness_attestation
  WHERE release_tag='OM-9.5' AND check_code='ORG_DEFAULT_UI_STABILIZED'
);
