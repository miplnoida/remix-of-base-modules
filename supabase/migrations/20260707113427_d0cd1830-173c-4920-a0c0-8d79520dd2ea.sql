INSERT INTO public.core_admin_domain_registry (domain_code, domain_name, description, is_active)
VALUES ('EMPLOYER','Employer','Employer registry and lifecycle governance.',true)
ON CONFLICT (domain_code) DO NOTHING;

INSERT INTO public.core_admin_route_registry
  (route_path, page_name, admin_domain, canonical_status, owner_module_code, requires_permission, show_in_platform_admin, is_active, description)
VALUES
  ('/admin/employer-registry','Employer Registry','EMPLOYER','CANONICAL','ER',
   'er.admin.employer_registry.view', true, true,
   'Modern governed employer screen (pilot). Runs in parallel with existing employer screens.'),
  ('/admin/employer-registry/:employerId','Employer Registry Detail','EMPLOYER','CANONICAL','ER',
   'er.admin.employer_registry.view', false, true,
   'Employer registry record detail (pilot).')
ON CONFLICT (route_path) DO UPDATE SET
  page_name = EXCLUDED.page_name, admin_domain = EXCLUDED.admin_domain,
  canonical_status = EXCLUDED.canonical_status, owner_module_code = EXCLUDED.owner_module_code,
  requires_permission = EXCLUDED.requires_permission,
  show_in_platform_admin = EXCLUDED.show_in_platform_admin,
  is_active = EXCLUDED.is_active, description = EXCLUDED.description, updated_at = now();

INSERT INTO public.core_permission_registry
  (permission_key, permission_name, module_code, domain_code, permission_scope, action_code, risk_level, is_platform_permission, is_sensitive_permission, is_admin_permission, description, is_active)
VALUES
  ('er.admin.employer_registry.view','View Employer Registry','ER','EMPLOYER','PAGE','view','LOW',false,false,true,'View the pilot Employer Registry screen.',true),
  ('er.admin.employer_registry.create','Create Employer (Registry)','ER','EMPLOYER','ACTION','create','HIGH',false,true,true,'Submit new employer via governed workflow.',true),
  ('er.admin.employer_registry.update','Update Employer (Registry)','ER','EMPLOYER','ACTION','update','HIGH',false,true,true,'Submit employer updates via governed workflow.',true),
  ('er.admin.employer_registry.deactivate','Deactivate Employer (Registry)','ER','EMPLOYER','ACTION','deactivate','HIGH',false,true,true,'Request employer deactivation via workflow.',true),
  ('er.admin.employer_registry.manage_status','Manage Employer Status (Registry)','ER','EMPLOYER','ACTION','manage_status','HIGH',false,true,true,'Request employer status change via workflow.',true),
  ('er.admin.employer_registry.view_sensitive','View Sensitive Employer Data (Registry)','ER','EMPLOYER','ACTION','view','CRITICAL',false,true,true,'View sensitive employer fields (audited).',true),
  ('er.admin.employer_registry.pilot_access','Employer Registry Pilot Access','ER','EMPLOYER','PAGE','view','LOW',false,false,true,'Pilot allow-list for Employer Registry.',true)
ON CONFLICT (permission_key) DO UPDATE SET
  permission_name = EXCLUDED.permission_name, is_active = EXCLUDED.is_active, updated_at = now();

INSERT INTO public.core_table_registry
  (table_name, modern_alias, ownership_type, module_code, domain_code, table_category, is_legacy_table,
   legacy_schema_name, legacy_table_name, data_classification, lifecycle_status, canonical_admin_route)
VALUES
  ('au_er_master','EmployerRegistryLegacyMaster','LEGACY','ER','EMPLOYER','MASTER',true,
   'public','au_er_master','INTERNAL','ACTIVE','/admin/employer-registry'),
  ('er_master','EmployerRegistryLegacyCurrent','LEGACY','ER','EMPLOYER','MASTER',true,
   'public','er_master','INTERNAL','ACTIVE','/admin/employer-registry')
ON CONFLICT (table_name) DO NOTHING;

INSERT INTO public.core_legacy_table_map
  (legacy_schema_name, legacy_table_name, modern_entity_name, module_code, domain_code, table_category,
   use_strategy, mapping_status, canonical_admin_route, is_master_table, is_read_only, source_system, description)
VALUES
  ('public','au_er_master','EmployerRegistryLegacyMaster','ER','EMPLOYER','MASTER',
   'ADAPTER','DISCOVERED','/admin/employer-registry',true,true,'POWERBUILDER','Primary legacy employer master (audit variant).'),
  ('public','er_master','EmployerRegistryLegacyCurrent','ER','EMPLOYER','MASTER',
   'ADAPTER','DISCOVERED','/admin/employer-registry',true,true,'POWERBUILDER','Current legacy employer master.')
ON CONFLICT (legacy_schema_name, legacy_table_name) DO NOTHING;

WITH tm AS (SELECT id FROM public.core_legacy_table_map WHERE legacy_table_name='au_er_master' LIMIT 1)
INSERT INTO public.core_legacy_column_map
  (table_map_id, legacy_column_name, modern_field_name, modern_required, is_primary_key, is_foreign_key, is_pii, contains_financial_data, contains_health_data, mapping_status, sort_order)
SELECT tm.id, c.leg, c.mod, false, c.pk, false, c.pii, false, false, 'DISCOVERED', c.ord
FROM tm, (VALUES
  ('regno','employerNumber',true,false,1),
  ('ername','employerName',false,false,2),
  ('erregdt','registrationDate',false,false,3),
  ('erstatus','employerStatus',false,false,4),
  ('ertype','employerType',false,false,5),
  ('erofficecode','officeCode',false,false,6),
  ('eraddr1','addressLine1',false,true,7),
  ('erphone','contactPhone',false,true,8),
  ('eremail','contactEmail',false,true,9)
) AS c(leg,mod,pk,pii,ord)
ON CONFLICT DO NOTHING;

WITH tm AS (SELECT id FROM public.core_legacy_table_map WHERE legacy_table_name='au_er_master' LIMIT 1)
INSERT INTO public.core_legacy_value_map
  (table_map_id, legacy_code, modern_code, modern_label, reference_group_code, mapping_status)
SELECT tm.id, v.leg, v.mod, v.lbl, 'EMPLOYER_STATUS', 'MAPPED'
FROM tm, (VALUES
  ('A','ACTIVE','Active'),
  ('I','INACTIVE','Inactive'),
  ('S','SUSPENDED','Suspended')
) AS v(leg,mod,lbl)
ON CONFLICT DO NOTHING;

INSERT INTO public.core_reference_source_map
  (reference_group_code, source_type, source_table_name, legacy_table_name, modern_entity_name, admin_route,
   owner_module_code, owner_domain_code, is_primary_source, sync_strategy, lifecycle_status, description, is_active)
VALUES
  ('EMPLOYER_STATUS','LEGACY_TABLE','au_er_master','au_er_master','EmployerStatus','/admin/employer-registry','ER','EMPLOYER',true,'ADAPTER','ACTIVE','Employer overall lifecycle status.',true),
  ('EMPLOYER_TYPE','LEGACY_TABLE','au_er_master','au_er_master','EmployerType','/admin/employer-registry','ER','EMPLOYER',true,'ADAPTER','ACTIVE','Employer legal/organisation type.',true),
  ('EMPLOYER_SECTOR','STATIC_ENUM',NULL,NULL,'EmployerSector','/admin/employer-registry','ER','EMPLOYER',true,'READ_ONLY','PLANNED','Economic sector.',true),
  ('EMPLOYER_CATEGORY','STATIC_ENUM',NULL,NULL,'EmployerCategory','/admin/employer-registry','ER','EMPLOYER',true,'READ_ONLY','PLANNED','Employer size/category.',true),
  ('EMPLOYER_REGISTRATION_STATUS','STATIC_ENUM',NULL,NULL,'EmployerRegistrationStatus','/admin/employer-registry','ER','EMPLOYER',true,'READ_ONLY','ACTIVE','Registration lifecycle.',true),
  ('EMPLOYER_COMPLIANCE_STATUS','STATIC_ENUM',NULL,NULL,'EmployerComplianceStatus','/admin/employer-registry','ER','EMPLOYER',true,'READ_ONLY','ACTIVE','Compliance state.',true),
  ('EMPLOYER_CONTRIBUTION_STATUS','STATIC_ENUM',NULL,NULL,'EmployerContributionStatus','/admin/employer-registry','ER','EMPLOYER',true,'READ_ONLY','ACTIVE','Contribution submission state.',true),
  ('BUSINESS_ACTIVITY_TYPE','STATIC_ENUM',NULL,NULL,'BusinessActivityType','/admin/employer-registry','ER','EMPLOYER',true,'READ_ONLY','PLANNED','Business activity classification.',true)
ON CONFLICT DO NOTHING;

INSERT INTO public.core_reference_consumer_map
  (reference_group_code, consumer_module_code, consumer_domain_code, consumer_feature, consumer_route,
   usage_type, is_required, can_cache, impact_level, is_active)
VALUES
  ('EMPLOYER_STATUS','ER','EMPLOYER','employer_registry','/admin/employer-registry','LOOKUP',true,true,'HIGH',true),
  ('EMPLOYER_TYPE','ER','EMPLOYER','employer_registry','/admin/employer-registry','LOOKUP',true,true,'MEDIUM',true),
  ('EMPLOYER_SECTOR','ER','EMPLOYER','employer_registry','/admin/employer-registry','LOOKUP',false,true,'LOW',true),
  ('EMPLOYER_CATEGORY','ER','EMPLOYER','employer_registry','/admin/employer-registry','LOOKUP',false,true,'LOW',true),
  ('EMPLOYER_REGISTRATION_STATUS','ER','EMPLOYER','employer_registry','/admin/employer-registry','LOOKUP',true,true,'HIGH',true),
  ('EMPLOYER_COMPLIANCE_STATUS','ER','EMPLOYER','employer_registry','/admin/employer-registry','LOOKUP',true,true,'HIGH',true),
  ('EMPLOYER_CONTRIBUTION_STATUS','ER','EMPLOYER','employer_registry','/admin/employer-registry','LOOKUP',true,true,'HIGH',true),
  ('BUSINESS_ACTIVITY_TYPE','ER','EMPLOYER','employer_registry','/admin/employer-registry','LOOKUP',false,true,'LOW',true)
ON CONFLICT DO NOTHING;

INSERT INTO public.core_audit_event_type
  (event_code, event_name, module_code, event_category, default_severity, default_risk_level, is_admin_event, description, is_active) VALUES
  ('EMPLOYER_REGISTRY_CREATED','Employer Registry Record Created','ER','EMPLOYER','INFO','MEDIUM',true,'New employer submitted via registry.',true),
  ('EMPLOYER_REGISTRY_UPDATED','Employer Registry Record Updated','ER','EMPLOYER','INFO','MEDIUM',true,'Employer update submitted via registry.',true),
  ('EMPLOYER_REGISTRY_DEACTIVATED','Employer Registry Deactivated','ER','EMPLOYER','WARN','HIGH',true,'Employer deactivation submitted.',true),
  ('EMPLOYER_REGISTRY_REACTIVATED','Employer Registry Reactivated','ER','EMPLOYER','INFO','MEDIUM',true,'Employer reactivation submitted.',true),
  ('EMPLOYER_STATUS_CHANGED','Employer Status Changed','ER','EMPLOYER','INFO','MEDIUM',true,'Employer lifecycle status change submitted.',true),
  ('EMPLOYER_SENSITIVE_VIEWED','Employer Sensitive Data Viewed','ER','EMPLOYER','INFO','HIGH',true,'Sensitive employer data viewed.',true),
  ('EMPLOYER_EXPORT_CREATED','Employer Registry Export Created','ER','EMPLOYER','INFO','MEDIUM',true,'Employer registry data exported.',true),
  ('EMPLOYER_LEGACY_MAPPING_USED','Employer Legacy Mapping Used','ER','EMPLOYER','INFO','LOW',true,'Employer registry consumed legacy mapping.',true)
ON CONFLICT (event_code) DO NOTHING;

INSERT INTO public.core_workflow_definition
  (workflow_code, workflow_name, description, module_code, domain_code, entity_type, version, workflow_status, start_step_code, is_active)
VALUES
  ('EMPLOYER_REGISTRATION_APPROVAL','Employer Registration Approval','Approve new employer registrations submitted via the Employer Registry pilot.','ER','EMPLOYER','EMPLOYER',1,'DRAFT','SUBMIT',true),
  ('EMPLOYER_STATUS_CHANGE_APPROVAL','Employer Status Change Approval','Approve employer status changes.','ER','EMPLOYER','EMPLOYER',1,'DRAFT','SUBMIT',true),
  ('EMPLOYER_DEACTIVATION_APPROVAL','Employer Deactivation Approval','Approve employer deactivation.','ER','EMPLOYER','EMPLOYER',1,'DRAFT','SUBMIT',true),
  ('EMPLOYER_SENSITIVE_CORRECTION_APPROVAL','Employer Sensitive Correction Approval','Approve corrections to sensitive employer fields.','ER','EMPLOYER','EMPLOYER',1,'DRAFT','SUBMIT',true)
ON CONFLICT DO NOTHING;

WITH defs AS (
  SELECT id, workflow_code FROM public.core_workflow_definition
  WHERE workflow_code IN ('EMPLOYER_REGISTRATION_APPROVAL','EMPLOYER_STATUS_CHANGE_APPROVAL','EMPLOYER_DEACTIVATION_APPROVAL','EMPLOYER_SENSITIVE_CORRECTION_APPROVAL')
)
INSERT INTO public.core_workflow_step
  (workflow_definition_id, step_code, step_name, step_type, is_start_step, is_end_step, display_order, is_active)
SELECT d.id, s.code, s.nm, s.tp, s.is_start, s.is_end, s.ord, true
FROM defs d
CROSS JOIN (VALUES
  ('SUBMIT','Submit','TASK',true,false,1),
  ('REVIEW','Review','APPROVAL',false,false,2),
  ('APPROVE','Approve','APPROVAL',false,false,3),
  ('END','End','END',false,true,4)
) AS s(code,nm,tp,is_start,is_end,ord)
ON CONFLICT DO NOTHING;

WITH defs AS (
  SELECT id, workflow_code FROM public.core_workflow_definition
  WHERE workflow_code IN ('EMPLOYER_REGISTRATION_APPROVAL','EMPLOYER_STATUS_CHANGE_APPROVAL','EMPLOYER_DEACTIVATION_APPROVAL','EMPLOYER_SENSITIVE_CORRECTION_APPROVAL')
)
INSERT INTO public.core_workflow_transition
  (workflow_definition_id, from_step_code, to_step_code, transition_code, transition_name, action_type, is_terminal, display_order, is_active)
SELECT d.id, t.fr, t.to_, t.code, t.nm, t.action, t.terminal, t.ord, true
FROM defs d
CROSS JOIN (VALUES
  ('SUBMIT','REVIEW','SEND_FOR_REVIEW','Send for review','SUBMIT',false,1),
  ('REVIEW','APPROVE','APPROVE_REVIEW','Approve review','APPROVE',false,2),
  ('APPROVE','END','FINAL_APPROVE','Final approve','APPROVE',true,3),
  ('REVIEW','SUBMIT','RETURN_TO_SUBMITTER','Return for changes','RETURN',false,4),
  ('APPROVE','END','REJECT','Reject','REJECT',true,5)
) AS t(fr,to_,code,nm,action,terminal,ord)
ON CONFLICT DO NOTHING;

INSERT INTO public.mig_migration_plan
  (plan_code, plan_name, description, source_system, target_system, plan_status, migration_strategy, notes, is_active)
VALUES
  ('EMPLOYER_FOUNDATION','Employer Foundation Migration','Track migration readiness for the Employer module (pilot).',
   'POWERBUILDER','MODERN_PLATFORM','DRAFT','ADAPTER_FIRST',
   'Foundation epic: no data movement. Tracks column/value mapping, validation, reconciliation, and cutover blockers.',true)
ON CONFLICT (plan_code) DO NOTHING;

WITH p AS (SELECT id FROM public.mig_migration_plan WHERE plan_code='EMPLOYER_FOUNDATION')
INSERT INTO public.mig_migration_plan_table
  (migration_plan_id, legacy_table_map_id, source_table_name, target_table_name, modern_entity_name,
   migration_order, migration_scope, readiness_status, include_in_migration,
   mapping_completeness_percent, validation_pass_percent, reconciliation_status, blocking_issue_count)
SELECT p.id, ltm.id, ltm.legacy_table_name, NULL, ltm.modern_entity_name,
       ord.n, 'FULL', 'PLANNED', true, 25, 0, 'NOT_STARTED', 0
FROM p, public.core_legacy_table_map ltm
JOIN (VALUES ('au_er_master',1),('er_master',2)) AS ord(t,n) ON ord.t = ltm.legacy_table_name
ON CONFLICT DO NOTHING;

INSERT INTO public.app_modules
  (id, name, display_name, description, icon, route, is_enabled, show_in_menu, routes_enabled, actions_enabled, sort_order, parent_id)
VALUES
  ('e1000001-0000-4000-8000-000000000001', 'admin_employer_registry', 'Employer Registry',
   'Modern governed employer screen (pilot). Runs in parallel with the existing employer screens.',
   'Building2', '/admin/employer-registry', true, true, true, true, 20,
   'aab5fcb8-51fb-4a5c-8a87-6cef31068b47')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  route = EXCLUDED.route, icon = EXCLUDED.icon, is_enabled = EXCLUDED.is_enabled,
  show_in_menu = EXCLUDED.show_in_menu, updated_at = now();

INSERT INTO public.module_actions (id, module_id, action_name, display_name, description, is_enabled) VALUES
  ('e1000001-0000-4000-8000-000000000101','e1000001-0000-4000-8000-000000000001','view','View','View Employer Registry',true),
  ('e1000001-0000-4000-8000-000000000102','e1000001-0000-4000-8000-000000000001','create','Create','Submit new employer',true),
  ('e1000001-0000-4000-8000-000000000103','e1000001-0000-4000-8000-000000000001','update','Update','Submit employer update',true),
  ('e1000001-0000-4000-8000-000000000104','e1000001-0000-4000-8000-000000000001','deactivate','Deactivate','Submit deactivation',true),
  ('e1000001-0000-4000-8000-000000000105','e1000001-0000-4000-8000-000000000001','manage_status','Manage Status','Submit status change',true),
  ('e1000001-0000-4000-8000-000000000106','e1000001-0000-4000-8000-000000000001','view_sensitive','View Sensitive','View sensitive employer data',true),
  ('e1000001-0000-4000-8000-000000000107','e1000001-0000-4000-8000-000000000001','pilot_access','Pilot Access','Pilot allow-list',true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, 'e1000001-0000-4000-8000-000000000001'::uuid, a.id, true
FROM public.roles r
CROSS JOIN public.module_actions a
WHERE r.role_name IN ('Admin','Application Admin')
  AND a.module_id = 'e1000001-0000-4000-8000-000000000001'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.module_id = 'e1000001-0000-4000-8000-000000000001'::uuid
      AND rp.action_id = a.id
  );

INSERT INTO public.core_audit_log (event_code, event_name, event_category, severity, risk_level,
  module_code, domain_code, entity_type, action, outcome, source, is_system_generated, notes) VALUES
  ('EMPLOYER_REGISTRY_CREATED','Employer Registry Foundation Seeded','EMPLOYER','INFO','MEDIUM',
   'ER','EMPLOYER','app_modules','REGISTER','SUCCESS','MIGRATION',true,
   'Seeded Employer Registry route, permissions, tables, legacy mapping, reference governance, workflow drafts, and migration plan (pilot, non-disruptive).');