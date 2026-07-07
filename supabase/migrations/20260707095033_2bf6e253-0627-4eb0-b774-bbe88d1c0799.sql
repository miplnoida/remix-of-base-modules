
CREATE TABLE IF NOT EXISTS public.core_platform_service (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code text NOT NULL UNIQUE,
  service_name text NOT NULL,
  category text NOT NULL DEFAULT 'PLATFORM',
  status text NOT NULL DEFAULT 'ACTIVE',
  maturity text NOT NULL DEFAULT 'GA',
  is_mandatory boolean NOT NULL DEFAULT false,
  owner_module_code text NOT NULL DEFAULT 'CORE',
  owner_team text,
  primary_route text,
  description text,
  documentation_url text,
  health_status text NOT NULL DEFAULT 'HEALTHY',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_platform_service TO authenticated;
GRANT ALL ON public.core_platform_service TO service_role;

CREATE TABLE IF NOT EXISTS public.core_platform_service_contract (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.core_platform_service(id) ON DELETE CASCADE,
  contract_code text NOT NULL,
  contract_name text NOT NULL,
  contract_type text NOT NULL DEFAULT 'API',
  version text NOT NULL DEFAULT '1.0',
  status text NOT NULL DEFAULT 'ACTIVE',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, contract_code, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_platform_service_contract TO authenticated;
GRANT ALL ON public.core_platform_service_contract TO service_role;

CREATE TABLE IF NOT EXISTS public.core_platform_service_consumer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.core_platform_service(id) ON DELETE CASCADE,
  consumer_module_code text NOT NULL,
  consumer_name text NOT NULL,
  consumption_type text NOT NULL DEFAULT 'DIRECT',
  status text NOT NULL DEFAULT 'ACTIVE',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, consumer_module_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_platform_service_consumer TO authenticated;
GRANT ALL ON public.core_platform_service_consumer TO service_role;

CREATE TABLE IF NOT EXISTS public.core_platform_module_checklist_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code text NOT NULL UNIQUE,
  item_name text NOT NULL,
  category text NOT NULL DEFAULT 'INTEGRATION',
  is_mandatory boolean NOT NULL DEFAULT true,
  description text,
  display_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_platform_module_checklist_item TO authenticated;
GRANT ALL ON public.core_platform_module_checklist_item TO service_role;

CREATE TABLE IF NOT EXISTS public.core_platform_module_assessment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code text NOT NULL,
  checklist_item_id uuid NOT NULL REFERENCES public.core_platform_module_checklist_item(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING',
  waived boolean NOT NULL DEFAULT false,
  waiver_reason text,
  notes text,
  assessed_by uuid,
  assessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_code, checklist_item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_platform_module_assessment TO authenticated;
GRANT ALL ON public.core_platform_module_assessment TO service_role;

INSERT INTO public.core_table_registry
  (table_name, ownership_type, module_code, domain_code, table_category, is_legacy_table, data_classification, lifecycle_status, canonical_admin_route)
VALUES
  ('core_platform_service','PLATFORM','CORE','GOVERNANCE','CONFIGURATION',false,'INTERNAL','ACTIVE','/admin/platform-services'),
  ('core_platform_service_contract','PLATFORM','CORE','GOVERNANCE','CONFIGURATION',false,'INTERNAL','ACTIVE','/admin/platform-services'),
  ('core_platform_service_consumer','PLATFORM','CORE','GOVERNANCE','CONFIGURATION',false,'INTERNAL','ACTIVE','/admin/platform-services'),
  ('core_platform_module_checklist_item','PLATFORM','CORE','GOVERNANCE','CONFIGURATION',false,'INTERNAL','ACTIVE','/admin/platform-services'),
  ('core_platform_module_assessment','PLATFORM','CORE','GOVERNANCE','CONFIGURATION',false,'INTERNAL','ACTIVE','/admin/platform-services')
ON CONFLICT (table_name) DO NOTHING;

INSERT INTO public.core_admin_route_registry
  (route_path, page_name, admin_domain, canonical_status, owner_module_code, requires_permission, show_in_platform_admin, is_active, description)
VALUES
  ('/admin/platform-services', 'Platform Service Catalogue', 'GOVERNANCE', 'CANONICAL', 'CORE',
   'core.admin.platform_services.view', true, true,
   'Review reusable platform services, module contracts, integration readiness, and service health.')
ON CONFLICT (route_path) DO UPDATE SET
  page_name = EXCLUDED.page_name, admin_domain = EXCLUDED.admin_domain,
  canonical_status = EXCLUDED.canonical_status, owner_module_code = EXCLUDED.owner_module_code,
  requires_permission = EXCLUDED.requires_permission,
  show_in_platform_admin = EXCLUDED.show_in_platform_admin,
  is_active = EXCLUDED.is_active, description = EXCLUDED.description, updated_at = now();

INSERT INTO public.core_permission_registry
  (permission_key, permission_name, module_code, domain_code, permission_scope, action_code, risk_level, is_platform_permission, is_sensitive_permission, is_admin_permission, description, is_active)
VALUES
  ('core.admin.platform_services.view','View Platform Service Catalogue','CORE','GOVERNANCE','PAGE','view','LOW',true,false,true,'View Platform Service Catalogue',true),
  ('core.admin.platform_services.manage','Manage Platform Services','CORE','GOVERNANCE','ADMIN','manage','HIGH',true,true,true,'Create/update platform services',true),
  ('core.admin.platform_services.manage_contracts','Manage Service Contracts','CORE','GOVERNANCE','ADMIN','manage','HIGH',true,true,true,'Manage service contracts',true),
  ('core.admin.platform_services.manage_consumers','Manage Service Consumers','CORE','GOVERNANCE','ADMIN','manage','MEDIUM',true,false,true,'Manage service consumers',true),
  ('core.admin.platform_services.manage_checklists','Manage Module Checklists','CORE','GOVERNANCE','ADMIN','manage','MEDIUM',true,false,true,'Manage module readiness checklists',true),
  ('core.admin.platform_services.assess_modules','Assess Modules','CORE','GOVERNANCE','ADMIN','assess','MEDIUM',true,false,true,'Perform module assessments',true),
  ('core.admin.platform_services.waive_checklist','Waive Checklist Items','CORE','GOVERNANCE','ADMIN','waive','HIGH',true,true,true,'Waive checklist items',true),
  ('core.admin.platform_services.export','Export Platform Services','CORE','GOVERNANCE','ADMIN','export','MEDIUM',true,false,true,'Export platform service data',true)
ON CONFLICT (permission_key) DO UPDATE SET
  permission_name = EXCLUDED.permission_name, is_active = EXCLUDED.is_active, updated_at = now();

INSERT INTO public.core_audit_event_type
  (event_code, event_name, module_code, event_category, default_severity, default_risk_level, is_admin_event, description, is_active) VALUES
  ('PLATFORM_SERVICE_CREATED','Platform Service Created','CORE','GOVERNANCE','INFO','MEDIUM',true,'Platform service created',true),
  ('PLATFORM_SERVICE_UPDATED','Platform Service Updated','CORE','GOVERNANCE','INFO','MEDIUM',true,'Platform service updated',true),
  ('PLATFORM_SERVICE_CONTRACT_CREATED','Service Contract Created','CORE','GOVERNANCE','INFO','MEDIUM',true,'Service contract created',true),
  ('PLATFORM_SERVICE_CONTRACT_UPDATED','Service Contract Updated','CORE','GOVERNANCE','INFO','MEDIUM',true,'Service contract updated',true),
  ('PLATFORM_SERVICE_CONSUMER_CREATED','Service Consumer Created','CORE','GOVERNANCE','INFO','LOW',true,'Consumer registered',true),
  ('PLATFORM_SERVICE_CONSUMER_UPDATED','Service Consumer Updated','CORE','GOVERNANCE','INFO','LOW',true,'Consumer updated',true),
  ('PLATFORM_SERVICE_CHECKLIST_CREATED','Checklist Item Created','CORE','GOVERNANCE','INFO','LOW',true,'Checklist item created',true),
  ('PLATFORM_SERVICE_CHECKLIST_UPDATED','Checklist Item Updated','CORE','GOVERNANCE','INFO','LOW',true,'Checklist item updated',true),
  ('PLATFORM_SERVICE_MODULE_ASSESSED','Module Assessed','CORE','GOVERNANCE','INFO','MEDIUM',true,'Module assessment recorded',true),
  ('PLATFORM_SERVICE_CHECKLIST_WAIVED','Checklist Item Waived','CORE','GOVERNANCE','WARN','HIGH',true,'Checklist item waived',true),
  ('PLATFORM_SERVICE_EXPORTED','Platform Services Exported','CORE','GOVERNANCE','INFO','MEDIUM',true,'Platform services exported',true),
  ('PLATFORM_SERVICE_MENU_REGISTERED','Platform Service Menu Registered','CORE','GOVERNANCE','INFO','LOW',true,'Platform service menu registered',true),
  ('PLATFORM_SERVICE_PERMISSION_ASSIGNED','Platform Service Permission Assigned','CORE','GOVERNANCE','INFO','MEDIUM',true,'Platform service permission granted to role',true),
  ('PLATFORM_SERVICE_ADMIN_ACCESS_VERIFIED','Platform Service Admin Access Verified','CORE','GOVERNANCE','INFO','LOW',true,'Admin access verified',true)
ON CONFLICT (event_code) DO NOTHING;

INSERT INTO public.core_platform_service
  (service_code, service_name, category, status, maturity, is_mandatory, owner_module_code, owner_team, primary_route, description, display_order) VALUES
  ('ADMIN_ROUTE_REGISTRY','Admin Route Registry','GOVERNANCE','ACTIVE','GA',true,'CORE','Platform','/admin/route-registry','Canonical admin route registry',10),
  ('TABLE_REGISTRY','Table Registry','GOVERNANCE','ACTIVE','GA',true,'CORE','Platform','/admin/table-registry','Canonical table registry',20),
  ('LEGACY_MAPPING','Legacy Mapping','MIGRATION','ACTIVE','GA',true,'CORE','Platform','/admin/legacy-mapping','PowerBuilder legacy mapping dictionary',30),
  ('REFERENCE_GOVERNANCE','Reference Governance','GOVERNANCE','ACTIVE','GA',true,'CORE','Platform','/admin/reference-framework','Reference framework governance',40),
  ('RBAC_PERMISSION_REGISTRY','RBAC & Permission Registry','SECURITY','ACTIVE','GA',true,'CORE','Platform','/admin/permission-registry','Permission source of truth',50),
  ('IDENTITY_SERVICE','Identity Service','IDENTITY','ACTIVE','GA',true,'CORE','Platform','/admin/users','Users, staff, security state',60),
  ('ORGANIZATION_SERVICE','Organization Service','ORGANISATION','ACTIVE','GA',true,'CORE','Platform','/admin/offices','Offices, departments, designations',70),
  ('AUDIT_SERVICE','Audit Service','GOVERNANCE','ACTIVE','GA',true,'CORE','Platform','/admin/audit-log','Standardized audit logging',80),
  ('WORKFLOW_SERVICE','Workflow Service','OPERATIONS','ACTIVE','GA',true,'CORE','Platform','/admin/workflow-inbox','Reusable workflow engine',90),
  ('MIGRATION_SERVICE','Migration Service','MIGRATION','ACTIVE','GA',true,'MIG','Platform','/admin/migration-control','PowerBuilder migration control',100),
  ('DOCUMENT_SERVICE','Document Service','DOCUMENTS','PLANNED','PLANNED',false,'CORE','Platform',NULL,'Document generation & DMS',110),
  ('NOTIFICATION_SERVICE','Notification Service','COMMUNICATION','PLANNED','PLANNED',false,'CORE','Platform',NULL,'Notification delivery',120),
  ('NUMBERING_SERVICE','Numbering Service','PLATFORM','PLANNED','PLANNED',false,'CORE','Platform',NULL,'Enterprise number sequences',130),
  ('REPORTING_EXPORT_SERVICE','Reporting & Export Service','REPORTING','PLANNED','PLANNED',false,'CORE','Platform',NULL,'Reporting and export',140),
  ('IMPORT_SERVICE','Import Service','INTEGRATION','PLANNED','PLANNED',false,'CORE','Platform',NULL,'Bulk import',150),
  ('INTEGRATION_SERVICE','Integration Service','INTEGRATION','PLANNED','PLANNED',false,'CORE','Platform',NULL,'External integrations',160)
ON CONFLICT (service_code) DO UPDATE SET
  service_name = EXCLUDED.service_name, category = EXCLUDED.category, status = EXCLUDED.status,
  maturity = EXCLUDED.maturity, primary_route = EXCLUDED.primary_route, description = EXCLUDED.description,
  updated_at = now();

INSERT INTO public.core_platform_module_checklist_item (item_code, item_name, category, is_mandatory, description, display_order) VALUES
  ('ROUTE_REGISTERED','Route Registered','INTEGRATION',true,'Module admin routes registered in core_admin_route_registry',10),
  ('TABLES_REGISTERED','Tables Registered','INTEGRATION',true,'Module tables registered in core_table_registry',20),
  ('PERMISSIONS_REGISTERED','Permissions Registered','SECURITY',true,'Permissions registered in core_permission_registry',30),
  ('AUDIT_INTEGRATED','Audit Integrated','GOVERNANCE',true,'Module writes to core_audit_log via coreAuditService',40),
  ('WORKFLOW_INTEGRATED','Workflow Integrated','OPERATIONS',false,'Module uses core workflow engine where applicable',50),
  ('LEGACY_MAPPED','Legacy Mapped','MIGRATION',false,'PowerBuilder legacy tables mapped',60),
  ('REFERENCE_ADOPTED','Reference Adopted','GOVERNANCE',true,'Module uses canonical reference framework',70)
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO public.app_modules
  (id, name, display_name, description, icon, route, is_enabled, show_in_menu, routes_enabled, actions_enabled, sort_order, parent_id)
VALUES
  ('f0110011-0000-4000-8000-000000000001', 'admin_platform_services', 'Platform Service Catalogue',
   'Review reusable platform services, module contracts, integration readiness, and service health.',
   'Layers', '/admin/platform-services', true, true, true, true, 6,
   'aab5fcb8-51fb-4a5c-8a87-6cef31068b47')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  route = EXCLUDED.route, icon = EXCLUDED.icon, is_enabled = EXCLUDED.is_enabled,
  show_in_menu = EXCLUDED.show_in_menu, updated_at = now();

INSERT INTO public.module_actions (id, module_id, action_name, display_name, description, is_enabled) VALUES
  ('f0110011-0000-4000-8000-000000000101','f0110011-0000-4000-8000-000000000001','view','View','View Platform Service Catalogue',true),
  ('f0110011-0000-4000-8000-000000000102','f0110011-0000-4000-8000-000000000001','manage','Manage Services','Create/update platform services',true),
  ('f0110011-0000-4000-8000-000000000103','f0110011-0000-4000-8000-000000000001','manage_contracts','Manage Contracts','Manage service contracts',true),
  ('f0110011-0000-4000-8000-000000000104','f0110011-0000-4000-8000-000000000001','manage_consumers','Manage Consumers','Manage service consumers',true),
  ('f0110011-0000-4000-8000-000000000105','f0110011-0000-4000-8000-000000000001','manage_checklists','Manage Checklists','Manage checklists',true),
  ('f0110011-0000-4000-8000-000000000106','f0110011-0000-4000-8000-000000000001','assess_modules','Assess Modules','Perform module assessments',true),
  ('f0110011-0000-4000-8000-000000000107','f0110011-0000-4000-8000-000000000001','waive_checklist','Waive Checklist','Waive checklist items',true),
  ('f0110011-0000-4000-8000-000000000108','f0110011-0000-4000-8000-000000000001','export','Export','Export platform service data',true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, 'f0110011-0000-4000-8000-000000000001'::uuid, a.id, true
FROM public.roles r
CROSS JOIN public.module_actions a
WHERE r.role_name IN ('Admin','Application Admin')
  AND a.module_id = 'f0110011-0000-4000-8000-000000000001'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.module_id = 'f0110011-0000-4000-8000-000000000001'::uuid
      AND rp.action_id = a.id
  );

INSERT INTO public.core_audit_log (event_code, event_name, event_category, severity, risk_level,
  module_code, domain_code, entity_type, action, outcome, source, is_system_generated, notes) VALUES
  ('PLATFORM_SERVICE_MENU_REGISTERED','Platform Service Menu Registered','GOVERNANCE','INFO','LOW',
   'CORE','GOVERNANCE','app_modules','REGISTER','SUCCESS','MIGRATION',true,
   'Registered /admin/platform-services in navigation'),
  ('PLATFORM_SERVICE_PERMISSION_ASSIGNED','Platform Service Permission Assigned','GOVERNANCE','INFO','MEDIUM',
   'CORE','GOVERNANCE','role_permissions','GRANT','SUCCESS','MIGRATION',true,
   'Granted Epic 11 permissions to Admin and Application Admin roles');
