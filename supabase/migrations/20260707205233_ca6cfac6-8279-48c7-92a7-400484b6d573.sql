
-- OM-9.7: Department Profile Inheritance UX & Preview Stabilization

-- 1. Audit event types
INSERT INTO public.core_audit_event_type (event_code, event_name, event_category, domain_code, is_admin_event, is_active) VALUES
  ('DEPARTMENT_PROFILE_UX_STABILIZED',        'Department profile UX stabilized',      'ORGANIZATION','ORGANIZATION', true,  true),
  ('DEPARTMENT_PROFILE_CONFIG_OPENED',        'Department profile config opened',      'ORGANIZATION','ORGANIZATION', false, true),
  ('DEPARTMENT_PROFILE_SETTINGS_UPDATED',     'Department profile settings updated',   'ORGANIZATION','ORGANIZATION', true,  true),
  ('DEPARTMENT_PROFILE_OVERRIDE_ENABLED',     'Department profile override enabled',   'ORGANIZATION','ORGANIZATION', true,  true),
  ('DEPARTMENT_PROFILE_OVERRIDE_CHANGED',     'Department profile override changed',   'ORGANIZATION','ORGANIZATION', true,  true),
  ('DEPARTMENT_PROFILE_OVERRIDE_RESET',       'Department profile override reset',     'ORGANIZATION','ORGANIZATION', true,  true),
  ('DEPARTMENT_PROFILE_ALL_OVERRIDES_RESET',  'All department overrides reset',        'ORGANIZATION','ORGANIZATION', true,  true),
  ('DEPARTMENT_PROFILE_HEALTH_CHECK_RUN',     'Department profile health check run',   'ORGANIZATION','ORGANIZATION', true,  true),
  ('DEPARTMENT_PROFILE_PREVIEW_RUN',          'Department profile preview run',        'ORGANIZATION','ORGANIZATION', false, true),
  ('DEPARTMENT_PROFILE_PREVIEW_FAILED',       'Department profile preview failed',     'ORGANIZATION','ORGANIZATION', false, true),
  ('DEPARTMENT_PROFILE_BACKFILL_RUN',         'Department profile backfill run',       'ORGANIZATION','ORGANIZATION', true,  true),
  ('DEPARTMENT_PROFILE_BACKFILL_CREATED',     'Department profile backfill created',   'ORGANIZATION','ORGANIZATION', true,  true)
ON CONFLICT (event_code) DO UPDATE
  SET is_active = true, event_name = EXCLUDED.event_name, event_category = EXCLUDED.event_category;

-- 2. Reference groups
INSERT INTO public.core_reference_group (group_code, group_name, description, is_active) VALUES
  ('DEPARTMENT_PROFILE_SETTING_KEY',   'Department Profile Setting Key',  'Supported keys for department profile inheritance UI', true),
  ('DEPARTMENT_PROFILE_HEALTH_STATUS', 'Department Profile Health Status','OK / WARN / ERROR / MISSING',                           true),
  ('DEPARTMENT_PROFILE_OVERRIDE_MODE', 'Department Profile Override Mode','INHERIT / OVERRIDE / RESET / MISSING / CONFLICT',        true),
  ('DEPARTMENT_PROFILE_PREVIEW_TYPE',  'Department Profile Preview Type', 'DOCUMENT / EMAIL / PRINT_FOOTER / EFFECTIVE',            true),
  ('DEPARTMENT_PROFILE_SOURCE_TYPE',   'Department Profile Source Type',  'DEPARTMENT_OVERRIDE / ORG_DEFAULT / MODULE_DEFAULT / MISSING', true)
ON CONFLICT (group_code) DO UPDATE SET is_active = true, group_name = EXCLUDED.group_name;

-- 3. Attestation
INSERT INTO public.core_release_readiness_attestation (release_tag, check_code, attested_status, notes, attested_by, attested_at, is_active)
SELECT 'OM-9.7', 'DEPARTMENT_PROFILE_UX_STABILIZED', 'ATTESTED',
       'OM-9.7: Department Profile dialog restructured; Comm Defaults now card-based with per-setting reset; Preview & Health uses canonical resolveEffectiveSettingsBundle; audit + reference vocabulary registered.',
       NULL::uuid, now(), true
WHERE NOT EXISTS (
  SELECT 1 FROM public.core_release_readiness_attestation
   WHERE release_tag='OM-9.7' AND check_code='DEPARTMENT_PROFILE_UX_STABILIZED'
);
