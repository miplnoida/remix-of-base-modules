-- Epic OM-7 — Configuration Center v2 governance seeds.

INSERT INTO public.core_audit_event_type
  (event_code, event_name, module_code, domain_code, event_category,
   default_severity, default_risk_level,
   is_admin_event, is_security_event, is_migration_event,
   is_pii_event, is_financial_event, requires_before_after, description, is_active)
VALUES
  ('CONFIG_GUIDED_ASSIGNMENT_CREATED',      'Guided Configuration Assignment Created',      'CORE','ORGANIZATION','CONFIGURATION','INFO','LOW',    true,false,false,false,false,true,  'Guided assignment created via Configuration Center v2.', true),
  ('CONFIG_GUIDED_ASSIGNMENT_UPDATED',      'Guided Configuration Assignment Updated',      'CORE','ORGANIZATION','CONFIGURATION','INFO','LOW',    true,false,false,false,false,true,  'Guided assignment updated via Configuration Center v2.', true),
  ('CONFIG_GUIDED_ASSIGNMENT_DEACTIVATED',  'Guided Configuration Assignment Deactivated',  'CORE','ORGANIZATION','CONFIGURATION','WARNING','MEDIUM',true,false,false,false,false,false,'Guided assignment deactivated via Configuration Center v2.', true),
  ('CONFIG_GUIDED_ASSIGNMENT_REACTIVATED',  'Guided Configuration Assignment Reactivated',  'CORE','ORGANIZATION','CONFIGURATION','INFO','LOW',    true,false,false,false,false,false,'Guided assignment reactivated via Configuration Center v2.', true),
  ('CONFIG_GUIDED_ASSIGNMENT_VALIDATED',    'Guided Configuration Assignment Validated',    'CORE','ORGANIZATION','CONFIGURATION','INFO','LOW',    true,false,false,false,false,false,'Guided assignment payload validated.', true),
  ('CONFIG_ASSIGNMENT_CONFLICT_DETECTED',   'Configuration Assignment Conflict Detected',   'CORE','ORGANIZATION','CONFIGURATION','WARNING','MEDIUM',true,false,false,false,false,false,'Conflict/invalid assignments detected by v2 health.', true),
  ('CONFIG_ASSIGNMENT_ADVANCED_VIEWED',     'Configuration Assignment Advanced View',       'CORE','ORGANIZATION','CONFIGURATION','INFO','LOW',    true,false,false,false,false,false,'Raw/advanced assignment details viewed.', true),
  ('CONFIG_ASSIGNMENT_ADVANCED_UPDATED',    'Configuration Assignment Advanced Update',     'CORE','ORGANIZATION','CONFIGURATION','WARNING','MEDIUM',true,false,false,false,false,true, 'Raw/advanced assignment fields updated.', true),
  ('CONFIG_TEST_RESOLVE_RUN',               'Configuration Test Resolve Run',               'CORE','ORGANIZATION','CONFIGURATION','INFO','LOW',    true,false,false,false,false,false,'Test Resolve executed via OM-6 resolver.', true),
  ('CONFIG_TEST_RESOLVE_FAILED',            'Configuration Test Resolve Failed',            'CORE','ORGANIZATION','CONFIGURATION','ERROR','MEDIUM',true,false,false,false,false,false,'Test Resolve failed to produce a bundle.', true),
  ('CONFIG_CENTER_V2_VERIFIED',             'Configuration Center v2 Verified',             'CORE','ORGANIZATION','CONFIGURATION','INFO','LOW',    true,false,false,false,false,false,'OM-7 Configuration Center v2 verified end-to-end.', true)
ON CONFLICT (event_code) DO UPDATE
SET event_name = EXCLUDED.event_name,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = now();

INSERT INTO public.core_reference_group (group_code, group_name, description, is_active, is_system, module_code)
VALUES
  ('COMM_ASSIGNMENT_STATUS',            'Communication Assignment Status',            'Lifecycle status of a configuration assignment.',                       true, true, 'CORE'),
  ('COMM_ASSIGNMENT_CONFLICT_TYPE',     'Communication Assignment Conflict Type',     'Conflict types raised by Configuration Center v2 health checks.',       true, true, 'CORE'),
  ('COMM_ASSIGNMENT_VALIDATION_STATUS', 'Communication Assignment Validation Status', 'Validation outcome for a guided assignment (VALID/WARN/INVALID).',      true, true, 'CORE')
ON CONFLICT (group_code) DO UPDATE
SET group_name = EXCLUDED.group_name,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = now();

INSERT INTO public.core_table_registry
  (table_name, modern_alias, ownership_type, module_code, domain_code, table_category,
   is_legacy_table, data_classification, lifecycle_status, canonical_admin_route)
VALUES
  ('core_configuration_assignment', 'ConfigurationAssignment', 'PLATFORM','CORE','ORGANIZATION','CONFIGURATION',
   false, 'INTERNAL', 'ACTIVE', '/admin/template-management/configuration-center')
ON CONFLICT (table_name) DO UPDATE
SET modern_alias = EXCLUDED.modern_alias,
    module_code = EXCLUDED.module_code,
    domain_code = EXCLUDED.domain_code,
    canonical_admin_route = EXCLUDED.canonical_admin_route,
    lifecycle_status = 'ACTIVE',
    updated_at = now();

INSERT INTO public.core_audit_log
  (event_code, event_category, module_code, domain_code, action,
   entity_type, entity_display_name, outcome, severity, risk_level, source_component, notes)
VALUES
  ('CONFIG_CENTER_V2_VERIFIED', 'CONFIGURATION', 'CORE', 'ORGANIZATION', 'EXECUTE',
   'configuration_center', 'OM-7 Configuration Center v2', 'SUCCESS', 'INFO', 'LOW', 'OM-7',
   'Guided assignments, validation, conflict detection, and Test Resolve wired to OM-6 resolver.');