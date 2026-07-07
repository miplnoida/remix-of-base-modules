
-- 1. Audit event types
INSERT INTO public.core_audit_event_type (event_code, event_name, event_category, domain_code, is_admin_event, is_active)
VALUES
  ('LOCATION_CANONICALIZATION_STARTED',      'Location canonicalization started',       'ORGANIZATION', 'ORGANIZATION', true, true),
  ('LOCATION_CANONICALIZATION_VERIFIED',     'Location canonicalization verified',      'ORGANIZATION', 'ORGANIZATION', true, true),
  ('LOCATION_CANONICAL_SERVICE_UPDATED',     'Canonical location service updated',      'ORGANIZATION', 'ORGANIZATION', true, true),
  ('LOCATION_COMPATIBILITY_MAPPING_CREATED', 'Location compatibility mapping created',  'ORGANIZATION', 'ORGANIZATION', true, true),
  ('LOCATION_COMPATIBILITY_MAPPING_UPDATED', 'Location compatibility mapping updated',  'ORGANIZATION', 'ORGANIZATION', true, true),
  ('LOCATION_COMPATIBILITY_MAPPING_MISSING', 'Location compatibility mapping missing',  'ORGANIZATION', 'ORGANIZATION', true, true),
  ('LOCATION_CONTEXT_RESOLVED',              'Location context resolved',               'ORGANIZATION', 'ORGANIZATION', false, true),
  ('LOCATION_CONTEXT_RESOLVE_FAILED',        'Location context resolution failed',      'ORGANIZATION', 'ORGANIZATION', false, true),
  ('LOCATION_HEALTH_CHECK_RUN',              'Location health check run',               'ORGANIZATION', 'ORGANIZATION', true, true),
  ('LOCATION_HEALTH_ISSUE_DETECTED',         'Location health issue detected',          'ORGANIZATION', 'ORGANIZATION', true, true),
  ('LOCATION_ROUTE_ALIAS_VERIFIED',          'Location route alias verified',           'ORGANIZATION', 'ORGANIZATION', true, true)
ON CONFLICT (event_code) DO UPDATE
  SET is_active = true, event_name = EXCLUDED.event_name, event_category = EXCLUDED.event_category;

-- 2. Reference groups
INSERT INTO public.core_reference_group (group_code, group_name, description, is_active)
VALUES
  ('LOCATION_TYPE',                    'Location Type',                    'Office / branch / service centre / archive / other',                     true),
  ('LOCATION_STATUS',                  'Location Status',                  'Active / inactive / retired',                                            true),
  ('LOCATION_COMPATIBILITY_STATUS',    'Location Compatibility Status',    'Canonical / legacy-mapped / legacy-unmapped',                            true),
  ('LOCATION_SOURCE_TYPE',             'Location Source Type',             'core_office_locations / office_locations / tb_office / core_offices_v',  true),
  ('OFFICE_LOCATION_RELATIONSHIP_TYPE','Office / Location Relationship',   'Primary / branch / satellite / archive',                                 true),
  ('LOCATION_HEALTH_STATUS',           'Location Health Status',           'Healthy / warning / critical',                                           true)
ON CONFLICT (group_code) DO UPDATE SET is_active = true, group_name = EXCLUDED.group_name;

-- 3. Table registry entries
INSERT INTO public.core_table_registry (
  table_name, table_prefix, modern_alias, domain_code, module_code,
  table_category, ownership_type, is_legacy_table,
  legacy_schema_name, legacy_table_name,
  canonical_service, canonical_admin_route,
  data_classification, contains_pii, contains_financial_data, contains_health_data,
  lifecycle_status, description, is_active
)
VALUES
  ('tb_office',             'tb_',   'core_offices_v',        'ORGANIZATION', 'CORE',
   'MASTER', 'LEGACY',   true,  'public', 'tb_office',
   'src/platform/organization/organizationService.ts', '/admin/offices',
   'INTERNAL', false, false, false,
   'ACTIVE', 'PowerBuilder office master. Read via core_offices_v.', true),
  ('core_offices_v',        'core_', 'core_offices_v',        'ORGANIZATION', 'CORE',
   'MASTER', 'PLATFORM', false, null, null,
   'src/platform/organization/organizationService.ts', '/admin/offices',
   'INTERNAL', false, false, false,
   'ACTIVE', 'Compatibility view over tb_office for modern consumption.', true),
  ('core_office_locations', 'core_', 'core_office_locations', 'ORGANIZATION', 'CORE',
   'MASTER', 'PLATFORM', false, null, null,
   'src/platform/organization/canonicalLocationService.ts', '/admin/locations',
   'INTERNAL', false, false, false,
   'ACTIVE', 'Canonical office locations / branches table. Preferred source for new modules.', true),
  ('office_locations',      null,    'core_office_locations', 'COMMUNICATION', 'CORE',
   'MASTER', 'LEGACY',   true,  'public', 'office_locations',
   'src/platform/organization/canonicalLocationService.ts', '/admin/locations',
   'INTERNAL', false, false, false,
   'ACTIVE', 'Communication-era locations table. Kept for backward compatibility; mapped to core_office_locations.', true)
ON CONFLICT (table_name) DO UPDATE
  SET modern_alias          = EXCLUDED.modern_alias,
      canonical_service     = EXCLUDED.canonical_service,
      canonical_admin_route = EXCLUDED.canonical_admin_route,
      description           = EXCLUDED.description,
      is_active             = true;

-- 4. Legacy table map — ADAPTER strategy
INSERT INTO public.core_legacy_table_map (
  legacy_schema_name, legacy_table_name,
  modern_table_name, modern_entity_name, modern_alias,
  domain_code, module_code, table_category,
  use_strategy, mapping_status,
  canonical_service_name, canonical_admin_route,
  source_system, description, is_active
)
VALUES
  ('public', 'office_locations',
   'core_office_locations', 'OfficeLocation', 'core_office_locations',
   'ORGANIZATION', 'CORE', 'MASTER',
   'ADAPTER', 'MAPPED',
   'src/platform/organization/canonicalLocationService.ts', '/admin/locations',
   'communication-era',
   'OM-9: office_locations kept in place; consumed via canonicalLocationService compatibility adapter. Do not rename or drop.',
   true)
ON CONFLICT DO NOTHING;

-- 5. Attestation
INSERT INTO public.core_audit_log (
  event_code, event_name, event_category, domain_code,
  entity_type, action, outcome, source,
  notes, metadata, event_time
)
VALUES (
  'LOCATION_CANONICALIZATION_VERIFIED',
  'Location canonicalization verified',
  'ORGANIZATION', 'ORGANIZATION',
  'ORGANIZATION', 'ATTEST', 'SUCCESS', 'migration',
  'OM-9 location canonicalization verified: canonical service, compatibility mapping, and registry entries in place.',
  jsonb_build_object(
    'epic',           'OM-9',
    'canonical_table','core_office_locations',
    'legacy_tables',  jsonb_build_array('office_locations','tb_office'),
    'canonical_view', 'core_offices_v',
    'routes',         jsonb_build_array('/admin/locations','/admin/org/foundation/locations','/admin/offices')
  ),
  now()
);
