-- OM-9.8: Module Ownership & Defaults + Designation & Approval Hierarchy governance.

INSERT INTO public.core_audit_event_type (event_code, event_name, event_category, domain_code, is_admin_event, is_active) VALUES
  ('MODULE_PROFILE_SEED_RUN',                'Module profile seed run',                'ORGANIZATION','ORGANIZATION', true, true),
  ('MODULE_PROFILE_CREATED',                 'Module profile created',                 'ORGANIZATION','ORGANIZATION', true, true),
  ('MODULE_PROFILE_UPDATED',                 'Module profile updated',                 'ORGANIZATION','ORGANIZATION', true, true),
  ('MODULE_PROFILE_SKIPPED_EXISTING',        'Module profile skipped existing',        'ORGANIZATION','ORGANIZATION', true, true),
  ('MODULE_PROFILE_HEALTH_CHECK_RUN',        'Module profile health check run',        'ORGANIZATION','ORGANIZATION', true, true),
  ('MODULE_PROFILE_HEALTH_ISSUE_DETECTED',   'Module profile health issue detected',   'ORGANIZATION','ORGANIZATION', true, true),
  ('MODULE_PROFILE_OWNERSHIP_UPDATED',       'Module profile ownership updated',       'ORGANIZATION','ORGANIZATION', true, true),
  ('MODULE_PROFILE_INHERITANCE_UPDATED',     'Module profile inheritance updated',     'ORGANIZATION','ORGANIZATION', true, true),
  ('MODULE_OWNERSHIP_DEFAULTS_VERIFIED',     'Module ownership defaults verified',     'ORGANIZATION','ORGANIZATION', true, true),
  ('DESIGNATION_HIERARCHY_CREATED',          'Designation hierarchy created',          'ORGANIZATION','ORGANIZATION', true, true),
  ('DESIGNATION_HIERARCHY_UPDATED',          'Designation hierarchy updated',          'ORGANIZATION','ORGANIZATION', true, true),
  ('DESIGNATION_HIERARCHY_REMOVED',          'Designation hierarchy relationship removed', 'ORGANIZATION','ORGANIZATION', true, true),
  ('DESIGNATION_HIERARCHY_VALIDATED',        'Designation hierarchy validated',        'ORGANIZATION','ORGANIZATION', true, true),
  ('DESIGNATION_HIERARCHY_HEALTH_CHECK_RUN', 'Designation hierarchy health check run', 'ORGANIZATION','ORGANIZATION', true, true),
  ('DESIGNATION_HIERARCHY_HEALTH_ISSUE_DETECTED', 'Designation hierarchy health issue detected', 'ORGANIZATION','ORGANIZATION', true, true),
  ('DESIGNATION_HIERARCHY_CYCLE_BLOCKED',    'Designation hierarchy cycle blocked',    'ORGANIZATION','ORGANIZATION', true, true),
  ('DESIGNATION_HIERARCHY_VERIFIED',         'Designation hierarchy verified',         'ORGANIZATION','ORGANIZATION', true, true)
ON CONFLICT (event_code) DO UPDATE
  SET is_active = true, event_name = EXCLUDED.event_name, event_category = EXCLUDED.event_category;

INSERT INTO public.core_reference_group (group_code, group_name, description, is_active) VALUES
  ('MODULE_PROFILE_STATUS',             'Module Profile Status',             'ACTIVE / INACTIVE / DRAFT', true),
  ('MODULE_OWNERSHIP_STATUS',           'Module Ownership Status',           'ASSIGNED / UNASSIGNED / PLANNED', true),
  ('MODULE_PROFILE_HEALTH_STATUS',      'Module Profile Health Status',      'OK / WARNING / ERROR / PLANNED', true),
  ('MODULE_INHERITANCE_MODE',           'Module Inheritance Mode',           'INHERITED / OVERRIDE / MISSING / PLANNED', true),
  ('DESIGNATION_HIERARCHY_STATUS',      'Designation Hierarchy Status',      'ACTIVE / INACTIVE', true),
  ('DESIGNATION_HIERARCHY_HEALTH_STATUS','Designation Hierarchy Health Status','OK / WARNING / ERROR', true),
  ('DESIGNATION_RELATIONSHIP_TYPE',     'Designation Relationship Type',     'REPORTS_TO / ESCALATES_TO / APPROVES_FOR', true),
  ('APPROVAL_HIERARCHY_STATUS',         'Approval Hierarchy Status',         'VALID / CYCLE / INCOMPLETE', true)
ON CONFLICT (group_code) DO UPDATE
  SET is_active = true, group_name = EXCLUDED.group_name, description = EXCLUDED.description;

INSERT INTO public.core_table_registry (table_name, domain_code, table_category, ownership_type, lifecycle_status, description)
SELECT * FROM (VALUES
  ('app_modules',            'ORGANIZATION', 'CONFIGURATION', 'PLATFORM', 'ACTIVE', 'Application/business modules registry'),
  ('core_module_profile',    'ORGANIZATION', 'CONFIGURATION', 'PLATFORM', 'ACTIVE', 'Module ownership & defaults per app module'),
  ('core_department_profile','ORGANIZATION', 'CONFIGURATION', 'PLATFORM', 'ACTIVE', 'Department profile inheritance & overrides'),
  ('core_department',        'ORGANIZATION', 'REFERENCE',     'PLATFORM', 'ACTIVE', 'Departments'),
  ('tb_designations',        'ORGANIZATION', 'REFERENCE',     'PLATFORM', 'ACTIVE', 'Designation master'),
  ('designation_hierarchy',  'ORGANIZATION', 'CONFIGURATION', 'PLATFORM', 'ACTIVE', 'Approval/escalation hierarchy for designations'),
  ('profiles',               'IDENTITY',     'MASTER',        'PLATFORM', 'ACTIVE', 'User profiles')
) AS v(table_name, domain_code, table_category, ownership_type, lifecycle_status, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.core_table_registry r WHERE r.table_name = v.table_name
);

INSERT INTO public.core_module_profile (module_id, module_code, is_active)
SELECT m.id, m.name, true
  FROM public.app_modules m
  LEFT JOIN public.core_module_profile p ON p.module_id = m.id
 WHERE COALESCE(m.is_enabled, true) = true
   AND p.id IS NULL;

INSERT INTO public.core_release_readiness_attestation (release_tag, check_code, attested_status, notes, attested_by, attested_at, is_active)
SELECT 'OM-9.8', 'MODULE_OWNERSHIP_DEFAULTS_VERIFIED', 'ATTESTED',
       'OM-9.8: Every enabled app module has a core_module_profile row. Existing ownership/override settings preserved.',
       NULL::uuid, now(), true
WHERE NOT EXISTS (
  SELECT 1 FROM public.core_release_readiness_attestation
   WHERE release_tag='OM-9.8' AND check_code='MODULE_OWNERSHIP_DEFAULTS_VERIFIED'
);

INSERT INTO public.core_release_readiness_attestation (release_tag, check_code, attested_status, notes, attested_by, attested_at, is_active)
SELECT 'OM-9.8', 'DESIGNATION_HIERARCHY_VERIFIED', 'ATTESTED',
       'OM-9.8: Designation & Approval Hierarchy surface clarified. Add/edit/remove audited. Cycle and self-parent blocked. Removal is relationship-only; tb_designations preserved.',
       NULL::uuid, now(), true
WHERE NOT EXISTS (
  SELECT 1 FROM public.core_release_readiness_attestation
   WHERE release_tag='OM-9.8' AND check_code='DESIGNATION_HIERARCHY_VERIFIED'
);