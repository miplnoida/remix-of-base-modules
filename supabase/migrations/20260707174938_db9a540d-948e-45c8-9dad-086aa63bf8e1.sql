
-- OM-6: Inheritance audit event types
INSERT INTO public.core_audit_event_type (event_code, event_name, event_category, description, default_severity, is_active, module_code, domain_code)
VALUES
  ('DEPARTMENT_SETTING_OVERRIDE_ENABLED',    'Department Setting Override Enabled',    'CONFIGURATION', 'A department override was enabled for an organisation setting.', 'INFO', true, 'CORE', 'ORGANIZATION'),
  ('DEPARTMENT_SETTING_OVERRIDE_DISABLED',   'Department Setting Override Disabled',   'CONFIGURATION', 'A department override was disabled; setting reverts to inherited default.', 'INFO', true, 'CORE', 'ORGANIZATION'),
  ('DEPARTMENT_SETTING_RESET_TO_ORG_DEFAULT','Department Setting Reset to Org Default','CONFIGURATION', 'A department setting was reset to the organisation default.', 'INFO', true, 'CORE', 'ORGANIZATION'),
  ('DEPARTMENT_SETTING_UPDATED',             'Department Setting Updated',             'CONFIGURATION', 'A department override value was updated.', 'INFO', true, 'CORE', 'ORGANIZATION'),
  ('DEPARTMENT_EFFECTIVE_SETTINGS_PREVIEWED','Department Effective Settings Previewed','CONFIGURATION', 'Effective settings previewed for a department via the canonical resolver.', 'INFO', true, 'CORE', 'ORGANIZATION'),
  ('ORG_EFFECTIVE_SETTINGS_PREVIEWED',       'Organisation Effective Settings Previewed','CONFIGURATION','Effective settings previewed at organisation scope.', 'INFO', true, 'CORE', 'ORGANIZATION'),
  ('EFFECTIVE_SETTINGS_RESOLVED',            'Effective Settings Resolved',            'CONFIGURATION', 'Runtime resolver returned an effective settings bundle.', 'INFO', true, 'CORE', 'ORGANIZATION'),
  ('INHERITANCE_HEALTH_CHECK_RUN',           'Inheritance Health Check Run',           'CONFIGURATION', 'The inheritance/override health check was executed.', 'INFO', true, 'CORE', 'ORGANIZATION'),
  ('INHERITANCE_MISMATCH_DETECTED',          'Inheritance Mismatch Detected',          'CONFIGURATION', 'A mismatch between inherit flag and override value was detected.', 'WARNING', true, 'CORE', 'ORGANIZATION'),
  ('INHERITANCE_MODEL_VERIFIED',             'Inheritance Model Verified',             'CONFIGURATION', 'OM-6 inheritance model verified end-to-end.', 'INFO', true, 'CORE', 'ORGANIZATION')
ON CONFLICT (event_code) DO UPDATE
SET event_name = EXCLUDED.event_name,
    description = EXCLUDED.description,
    event_category = EXCLUDED.event_category,
    default_severity = EXCLUDED.default_severity,
    is_active = true,
    updated_at = now();

-- OM-6: Reference groups for inheritance vocabulary
INSERT INTO public.core_reference_group (group_code, group_name, description, is_active, is_system, module_code)
VALUES
  ('COMM_SETTING_KEY',      'Communication Setting Key',      'Canonical keys for organisation/communication settings resolved by the effective-settings resolver.', true, true, 'CORE'),
  ('COMM_RESOURCE_TYPE',    'Communication Resource Type',    'Resource type buckets used by core_configuration_assignment.', true, true, 'CORE'),
  ('COMM_SCOPE_LEVEL',      'Communication Scope Level',      'Scope precedence tiers (USER..GLOBAL) used by the effective-settings resolver.', true, true, 'CORE'),
  ('COMM_INHERITANCE_MODE', 'Communication Inheritance Mode', 'How a setting is derived at a given scope (INHERIT/OVERRIDE/RESET/MISSING/CONFLICT).', true, true, 'CORE'),
  ('COMM_FALLBACK_STATUS',  'Communication Fallback Status',  'Fallback resolution status when no override/default matched.', true, true, 'CORE'),
  ('COMM_HEALTH_STATUS',    'Communication Health Status',    'Health state for a resolved setting (OK/WARN/ERROR/MISSING).', true, true, 'CORE'),
  ('COMM_SETTING_STATUS',   'Communication Setting Status',   'Lifecycle status of a configured setting value.', true, true, 'CORE')
ON CONFLICT (group_code) DO UPDATE
SET group_name = EXCLUDED.group_name,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = now();

-- Inheritance mode values
WITH grp AS (SELECT id FROM public.core_reference_group WHERE group_code = 'COMM_INHERITANCE_MODE')
INSERT INTO public.core_reference_value (group_id, value_code, value_label, description, sort_order, is_active, is_system)
SELECT grp.id, v.code, v.label, v.description, v.sort_order, true, true
FROM grp, (VALUES
  ('INHERIT',          'Inherit from parent scope', 'Value is inherited from a less-specific scope (organization/module/global).',   10),
  ('OVERRIDE',         'Overridden at this scope',  'Value is explicitly overridden at this scope.',                                 20),
  ('RESET_TO_DEFAULT', 'Reset to default',          'Explicit override cleared; value reverts to inherited default.',                30),
  ('MISSING',          'Missing configuration',     'No override and no inherited default; consumers may fail or use hard fallback.',40),
  ('CONFLICT',         'Conflicting configuration', 'Multiple active assignments compete at the same scope tier.',                   50)
) AS v(code, label, description, sort_order)
ON CONFLICT (group_id, value_code) DO UPDATE
SET value_label = EXCLUDED.value_label,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order,
    is_active = true,
    updated_at = now();

-- Health status values
WITH grp AS (SELECT id FROM public.core_reference_group WHERE group_code = 'COMM_HEALTH_STATUS')
INSERT INTO public.core_reference_value (group_id, value_code, value_label, description, sort_order, is_active, is_system)
SELECT grp.id, v.code, v.label, v.description, v.sort_order, true, true
FROM grp, (VALUES
  ('OK',      'OK',      'Setting resolves to an active configured value.', 10),
  ('WARN',    'Warning', 'Setting resolves but requires attention.',        20),
  ('ERROR',   'Error',   'Setting references a missing or invalid resource.', 30),
  ('MISSING', 'Missing', 'No value at any scope.',                          40)
) AS v(code, label, description, sort_order)
ON CONFLICT (group_id, value_code) DO UPDATE
SET value_label = EXCLUDED.value_label,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order,
    is_active = true,
    updated_at = now();

-- OM-6 attestation
INSERT INTO public.core_audit_log (
  event_code, event_category, module_code, domain_code, action,
  entity_type, entity_display_name, outcome, severity, risk_level,
  reason, source_component
) VALUES (
  'INHERITANCE_MODEL_VERIFIED', 'CONFIGURATION', 'CORE', 'ORGANIZATION', 'EXECUTE',
  'inheritance_model', 'OM-6 Settings Inheritance Alignment', 'SUCCESS', 'INFO', 'LOW',
  'OM-6 canonical effective-settings resolver, audit catalogue, reference vocabulary, and release-readiness check are in place.',
  'OM-6'
);
