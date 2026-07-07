
-- =========================================================================
-- Epic 5: RBAC Core Naming and Permission Registry
-- =========================================================================

-- 1) core_permission_registry -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.core_permission_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key text NOT NULL UNIQUE,
  permission_name text NOT NULL,
  description text,
  module_code text NOT NULL DEFAULT 'CORE',
  domain_code text,
  permission_scope text NOT NULL DEFAULT 'ACTION',
  resource_type text,
  resource_code text,
  action_code text NOT NULL,
  is_platform_permission boolean NOT NULL DEFAULT false,
  is_sensitive_permission boolean NOT NULL DEFAULT false,
  is_admin_permission boolean NOT NULL DEFAULT false,
  risk_level text NOT NULL DEFAULT 'LOW',
  lifecycle_status text NOT NULL DEFAULT 'ACTIVE',
  seeded_from_registry boolean NOT NULL DEFAULT false,
  source_file text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT core_permission_registry_scope_chk CHECK (permission_scope IN (
    'MODULE','PAGE','ACTION','FIELD','DATA','WORKFLOW','REPORT','EXPORT','SECURITY','ADMIN')),
  CONSTRAINT core_permission_registry_risk_chk CHECK (risk_level IN (
    'LOW','MEDIUM','HIGH','CRITICAL')),
  CONSTRAINT core_permission_registry_lifecycle_chk CHECK (lifecycle_status IN (
    'PLANNED','ACTIVE','DEPRECATED','RETIRED'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_permission_registry TO authenticated;
GRANT SELECT ON public.core_permission_registry TO anon;
GRANT ALL ON public.core_permission_registry TO service_role;

CREATE INDEX IF NOT EXISTS idx_core_permission_registry_module ON public.core_permission_registry(module_code);
CREATE INDEX IF NOT EXISTS idx_core_permission_registry_domain ON public.core_permission_registry(domain_code);
CREATE INDEX IF NOT EXISTS idx_core_permission_registry_lifecycle ON public.core_permission_registry(lifecycle_status);

-- 2) core_permission_sync_log ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.core_permission_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_started_at timestamptz NOT NULL DEFAULT now(),
  sync_completed_at timestamptz,
  sync_status text NOT NULL DEFAULT 'STARTED',
  source text NOT NULL DEFAULT 'permissionRegistry',
  permissions_found integer DEFAULT 0,
  permissions_created integer DEFAULT 0,
  permissions_updated integer DEFAULT 0,
  permissions_deprecated integer DEFAULT 0,
  permissions_missing_in_db integer DEFAULT 0,
  permissions_missing_in_registry integer DEFAULT 0,
  summary jsonb,
  errors jsonb,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT core_permission_sync_log_status_chk CHECK (sync_status IN (
    'STARTED','COMPLETED','FAILED','PARTIAL'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_permission_sync_log TO authenticated;
GRANT SELECT ON public.core_permission_sync_log TO anon;
GRANT ALL ON public.core_permission_sync_log TO service_role;

CREATE INDEX IF NOT EXISTS idx_core_permission_sync_log_started ON public.core_permission_sync_log(sync_started_at DESC);

-- 3) updated_at trigger -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.core_permission_registry_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_core_permission_registry_touch ON public.core_permission_registry;
CREATE TRIGGER trg_core_permission_registry_touch
BEFORE UPDATE ON public.core_permission_registry
FOR EACH ROW EXECUTE FUNCTION public.core_permission_registry_touch();

-- 4) Compatibility views over existing RBAC tables ---------------------------
DO $$
BEGIN
  IF to_regclass('public.app_modules') IS NOT NULL THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.core_app_modules_v AS SELECT * FROM public.app_modules';
    EXECUTE 'GRANT SELECT ON public.core_app_modules_v TO anon, authenticated';
    EXECUTE 'GRANT ALL ON public.core_app_modules_v TO service_role';
  END IF;
  IF to_regclass('public.module_actions') IS NOT NULL THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.core_module_actions_v AS SELECT * FROM public.module_actions';
    EXECUTE 'GRANT SELECT ON public.core_module_actions_v TO anon, authenticated';
    EXECUTE 'GRANT ALL ON public.core_module_actions_v TO service_role';
  END IF;
  IF to_regclass('public.role_permissions') IS NOT NULL THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.core_role_permissions_v AS SELECT * FROM public.role_permissions';
    EXECUTE 'GRANT SELECT ON public.core_role_permissions_v TO anon, authenticated';
    EXECUTE 'GRANT ALL ON public.core_role_permissions_v TO service_role';
  END IF;
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.core_user_roles_v AS SELECT * FROM public.user_roles';
    EXECUTE 'GRANT SELECT ON public.core_user_roles_v TO anon, authenticated';
    EXECUTE 'GRANT ALL ON public.core_user_roles_v TO service_role';
  END IF;
  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.core_user_profiles_v AS SELECT * FROM public.profiles';
    EXECUTE 'GRANT SELECT ON public.core_user_profiles_v TO anon, authenticated';
    EXECUTE 'GRANT ALL ON public.core_user_profiles_v TO service_role';
  END IF;
END $$;

-- 5) Register new tables in core_table_registry ------------------------------
INSERT INTO public.core_table_registry
  (table_name, table_prefix, modern_alias, domain_code, module_code, table_category,
   ownership_type, is_legacy_table, canonical_admin_route, data_classification,
   contains_pii, contains_financial_data, contains_health_data, lifecycle_status,
   description, is_active)
VALUES
  ('core_permission_registry','core_','core_permission_registry','SECURITY','CORE','SECURITY',
   'PLATFORM',false,'/admin/permission-registry','INTERNAL',false,false,false,'ACTIVE',
   'Governed registry of platform and module permission keys, risk levels, and lifecycle.',true),
  ('core_permission_sync_log','core_','core_permission_sync_log','SECURITY','CORE','SECURITY',
   'PLATFORM',false,'/admin/permission-registry','INTERNAL',false,false,false,'ACTIVE',
   'Audit log of permission registry synchronization runs.',true)
ON CONFLICT (table_name) DO UPDATE SET
  domain_code = EXCLUDED.domain_code,
  module_code = EXCLUDED.module_code,
  table_category = EXCLUDED.table_category,
  canonical_admin_route = EXCLUDED.canonical_admin_route,
  description = EXCLUDED.description,
  updated_at = now();

-- 6) Register /admin/permission-registry in core_admin_route_registry --------
INSERT INTO public.core_admin_route_registry
  (route_path, page_name, admin_domain, canonical_status, owner_module_code,
   description, page_component, source_file_path, requires_permission,
   show_in_platform_admin, display_order, is_active)
VALUES
  ('/admin/permission-registry','Permission Registry','SECURITY','CANONICAL','CORE',
   'Govern platform and module permission keys, lifecycle, risk, and RBAC synchronization.',
   'PermissionRegistryAdmin','src/pages/admin/PermissionRegistryAdmin.tsx',
   'core.admin.permission_registry.view', true, 50, true)
ON CONFLICT (route_path) DO UPDATE SET
  page_name = EXCLUDED.page_name,
  admin_domain = EXCLUDED.admin_domain,
  canonical_status = EXCLUDED.canonical_status,
  requires_permission = EXCLUDED.requires_permission,
  updated_at = now();

-- 7) Seed initial permissions ------------------------------------------------
INSERT INTO public.core_permission_registry
  (permission_key, permission_name, description, module_code, domain_code,
   permission_scope, action_code, is_platform_permission, is_admin_permission,
   is_sensitive_permission, risk_level, lifecycle_status, seeded_from_registry,
   source_file, is_active)
VALUES
  -- Admin route registry
  ('core.admin.route_registry.view','View Admin Route Registry','Read admin route registry entries','CORE','GOVERNANCE','PAGE','view',true,true,false,'LOW','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.route_registry.manage','Manage Admin Route Registry','Create/update admin route registry entries','CORE','GOVERNANCE','ADMIN','manage',true,true,false,'HIGH','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  -- Table registry
  ('core.admin.table_registry.view','View Table Registry','Read platform table registry','CORE','GOVERNANCE','PAGE','view',true,true,false,'LOW','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.table_registry.manage','Manage Table Registry','Create/update platform table registry','CORE','GOVERNANCE','ADMIN','manage',true,true,false,'HIGH','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  -- Legacy mapping
  ('core.admin.legacy_mapping.view','View Legacy Mapping','Read legacy table/column/value mappings','CORE','MIGRATION','PAGE','view',true,true,false,'LOW','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.legacy_mapping.manage','Manage Legacy Mapping','Edit legacy mappings','CORE','MIGRATION','ADMIN','manage',true,true,true,'HIGH','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.legacy_mapping.approve','Approve Legacy Mapping','Approve legacy mappings for production use','CORE','MIGRATION','ADMIN','approve',true,true,true,'CRITICAL','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  -- Reference governance
  ('core.admin.reference_governance.view','View Reference Governance','Read reference source/consumer/dependency governance','CORE','GOVERNANCE','PAGE','view',true,true,false,'LOW','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.reference_governance.manage','Manage Reference Governance','Manage reference sources, consumers, dependencies and policies','CORE','GOVERNANCE','ADMIN','manage',true,true,false,'HIGH','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.reference_governance.approve','Approve Reference Governance Changes','Approve reference governance changes','CORE','GOVERNANCE','ADMIN','approve',true,true,true,'CRITICAL','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  -- Permission registry itself
  ('core.admin.permission_registry.view','View Permission Registry','Read permission registry entries','CORE','SECURITY','PAGE','view',true,true,false,'LOW','ACTIVE',true,'src/platform/rbac/rbacPermissions.ts',true),
  ('core.admin.permission_registry.manage','Manage Permission Registry','Create/update permission registry entries','CORE','SECURITY','ADMIN','manage',true,true,true,'HIGH','ACTIVE',true,'src/platform/rbac/rbacPermissions.ts',true),
  ('core.admin.permission_registry.sync','Sync Permission Registry','Trigger sync from source registry to database','CORE','SECURITY','ADMIN','sync',true,true,true,'CRITICAL','ACTIVE',true,'src/platform/rbac/rbacPermissions.ts',true),
  -- Platform + configuration
  ('core.admin.platform.view','View Platform Admin','Access the Platform Administration hub','CORE','ADMINISTRATION','PAGE','view',true,true,false,'LOW','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.configuration.view','View Configuration Centre','Access configuration centre','CORE','ADMINISTRATION','PAGE','view',true,true,false,'LOW','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  -- Users
  ('core.admin.users.view','View Users','List platform users','CORE','SECURITY','PAGE','view',true,true,false,'LOW','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.users.create','Create Users','Create new users','CORE','SECURITY','ACTION','create',true,true,true,'HIGH','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.users.update','Update Users','Modify user records','CORE','SECURITY','ACTION','update',true,true,true,'HIGH','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.users.disable','Disable Users','Disable user accounts','CORE','SECURITY','ACTION','disable',true,true,true,'HIGH','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.users.manage_roles','Manage User Roles','Assign or revoke user roles','CORE','SECURITY','ADMIN','manage_roles',true,true,true,'CRITICAL','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  -- Roles
  ('core.admin.roles.view','View Roles','List roles','CORE','SECURITY','PAGE','view',true,true,false,'LOW','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.roles.create','Create Roles','Create new roles','CORE','SECURITY','ACTION','create',true,true,true,'HIGH','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.roles.update','Update Roles','Edit role definitions','CORE','SECURITY','ACTION','update',true,true,true,'HIGH','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.roles.assign_permissions','Assign Role Permissions','Grant/revoke permissions on roles','CORE','SECURITY','ADMIN','assign_permissions',true,true,true,'CRITICAL','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  -- Offices/Departments/Designations
  ('core.admin.offices.view','View Offices','','CORE','ORGANIZATION','PAGE','view',true,true,false,'LOW','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.offices.manage','Manage Offices','','CORE','ORGANIZATION','ADMIN','manage',true,true,false,'MEDIUM','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.departments.view','View Departments','','CORE','ORGANIZATION','PAGE','view',true,true,false,'LOW','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.departments.manage','Manage Departments','','CORE','ORGANIZATION','ADMIN','manage',true,true,false,'MEDIUM','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.designations.view','View Designations','','CORE','ORGANIZATION','PAGE','view',true,true,false,'LOW','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.designations.manage','Manage Designations','','CORE','ORGANIZATION','ADMIN','manage',true,true,false,'MEDIUM','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  -- Master data
  ('core.admin.master_data.view','View Master Data','','CORE','REFERENCE','PAGE','view',true,true,false,'LOW','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.master_data.manage','Manage Master Data','','CORE','REFERENCE','ADMIN','manage',true,true,false,'HIGH','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  -- Audit / system logs
  ('core.admin.audit.view','View Audit Log','','CORE','GOVERNANCE','PAGE','view',true,true,true,'MEDIUM','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.system_logs.view','View System Logs','','CORE','GOVERNANCE','PAGE','view',true,true,false,'LOW','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true)
ON CONFLICT (permission_key) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  description = EXCLUDED.description,
  module_code = EXCLUDED.module_code,
  domain_code = EXCLUDED.domain_code,
  permission_scope = EXCLUDED.permission_scope,
  action_code = EXCLUDED.action_code,
  is_platform_permission = EXCLUDED.is_platform_permission,
  is_admin_permission = EXCLUDED.is_admin_permission,
  is_sensitive_permission = EXCLUDED.is_sensitive_permission,
  risk_level = EXCLUDED.risk_level,
  lifecycle_status = EXCLUDED.lifecycle_status,
  seeded_from_registry = true,
  source_file = EXCLUDED.source_file,
  updated_at = now();
