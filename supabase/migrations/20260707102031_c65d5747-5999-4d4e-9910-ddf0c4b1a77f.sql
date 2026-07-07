
-- =====================================================================
-- Epic 12: Release Readiness Dashboard
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.core_release_readiness_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_tag text NOT NULL,
  overall_status text NOT NULL DEFAULT 'UNKNOWN',
  passed_count integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  check_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  run_by uuid,
  run_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_release_readiness_run TO authenticated;
GRANT ALL ON public.core_release_readiness_run TO service_role;

CREATE TABLE IF NOT EXISTS public.core_release_readiness_attestation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_tag text NOT NULL,
  check_code text NOT NULL,
  attested_status text NOT NULL DEFAULT 'PASSED',
  evidence_url text,
  notes text,
  attested_by uuid,
  attested_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (release_tag, check_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_release_readiness_attestation TO authenticated;
GRANT ALL ON public.core_release_readiness_attestation TO service_role;

-- Register tables
INSERT INTO public.core_table_registry
  (table_name, ownership_type, module_code, domain_code, table_category, is_legacy_table, data_classification, lifecycle_status, canonical_admin_route)
VALUES
  ('core_release_readiness_run','PLATFORM','CORE','GOVERNANCE','CONFIGURATION',false,'INTERNAL','ACTIVE','/admin/release-readiness'),
  ('core_release_readiness_attestation','PLATFORM','CORE','GOVERNANCE','CONFIGURATION',false,'INTERNAL','ACTIVE','/admin/release-readiness')
ON CONFLICT (table_name) DO NOTHING;

-- Register admin route
INSERT INTO public.core_admin_route_registry
  (route_path, page_name, admin_domain, canonical_status, owner_module_code, requires_permission, show_in_platform_admin, is_active, description)
VALUES
  ('/admin/release-readiness', 'Release Readiness Dashboard', 'GOVERNANCE', 'CANONICAL', 'CORE',
   'core.admin.release_readiness.view', true, true,
   'Aggregate route, table, permission, menu, audit, workflow, reference, migration, typecheck, and overall readiness checks for release sign-off.')
ON CONFLICT (route_path) DO UPDATE SET
  page_name = EXCLUDED.page_name, admin_domain = EXCLUDED.admin_domain,
  canonical_status = EXCLUDED.canonical_status, owner_module_code = EXCLUDED.owner_module_code,
  requires_permission = EXCLUDED.requires_permission,
  show_in_platform_admin = EXCLUDED.show_in_platform_admin,
  is_active = EXCLUDED.is_active, description = EXCLUDED.description, updated_at = now();

-- Permissions
INSERT INTO public.core_permission_registry
  (permission_key, permission_name, module_code, domain_code, permission_scope, action_code, risk_level, is_platform_permission, is_sensitive_permission, is_admin_permission, description, is_active)
VALUES
  ('core.admin.release_readiness.view','View Release Readiness Dashboard','CORE','GOVERNANCE','PAGE','view','LOW',true,false,true,'View release readiness checks',true),
  ('core.admin.release_readiness.run_checks','Run Release Readiness Checks','CORE','GOVERNANCE','ACTION','execute','MEDIUM',true,false,true,'Execute readiness checks',true),
  ('core.admin.release_readiness.attest','Attest Release Readiness Check','CORE','GOVERNANCE','ACTION','attest','HIGH',true,true,true,'Provide manual attestation for a check',true),
  ('core.admin.release_readiness.override','Override Release Readiness Check','CORE','GOVERNANCE','ADMIN','override','CRITICAL',true,true,true,'Override a failing readiness check',true),
  ('core.admin.release_readiness.export','Export Release Readiness Report','CORE','GOVERNANCE','ACTION','export','MEDIUM',true,false,true,'Export readiness report',true),
  ('core.admin.release_readiness.manage','Manage Release Readiness Configuration','CORE','GOVERNANCE','ADMIN','manage','HIGH',true,true,true,'Manage readiness configuration',true)
ON CONFLICT (permission_key) DO UPDATE SET
  permission_name = EXCLUDED.permission_name, is_active = EXCLUDED.is_active, updated_at = now();

-- Audit event types
INSERT INTO public.core_audit_event_type
  (event_code, event_name, module_code, event_category, default_severity, default_risk_level, is_admin_event, description, is_active) VALUES
  ('RELEASE_READINESS_CHECK_RUN','Release Readiness Check Run','CORE','GOVERNANCE','INFO','MEDIUM',true,'Release readiness checks executed',true),
  ('RELEASE_READINESS_CHECK_PASSED','Release Readiness Check Passed','CORE','GOVERNANCE','INFO','LOW',true,'Readiness check passed',true),
  ('RELEASE_READINESS_CHECK_FAILED','Release Readiness Check Failed','CORE','GOVERNANCE','WARN','HIGH',true,'Readiness check failed',true),
  ('RELEASE_READINESS_CHECK_ATTESTED','Release Readiness Attested','CORE','GOVERNANCE','INFO','MEDIUM',true,'Readiness check attested',true),
  ('RELEASE_READINESS_CHECK_OVERRIDDEN','Release Readiness Overridden','CORE','GOVERNANCE','WARN','CRITICAL',true,'Readiness check overridden',true),
  ('RELEASE_READINESS_EXPORTED','Release Readiness Report Exported','CORE','GOVERNANCE','INFO','MEDIUM',true,'Readiness report exported',true),
  ('RELEASE_READINESS_ATTESTATION_REVOKED','Release Readiness Attestation Revoked','CORE','GOVERNANCE','WARN','HIGH',true,'Attestation revoked',true),
  ('RELEASE_READINESS_MENU_REGISTERED','Release Readiness Menu Registered','CORE','GOVERNANCE','INFO','LOW',true,'Release readiness menu registered',true),
  ('RELEASE_READINESS_PERMISSION_ASSIGNED','Release Readiness Permission Assigned','CORE','GOVERNANCE','INFO','MEDIUM',true,'Release readiness permission granted to role',true),
  ('RELEASE_READINESS_ADMIN_ACCESS_VERIFIED','Release Readiness Admin Access Verified','CORE','GOVERNANCE','INFO','LOW',true,'Release readiness admin access verified',true)
ON CONFLICT (event_code) DO NOTHING;

-- App module + actions for navigation and RBAC
INSERT INTO public.app_modules
  (id, name, display_name, description, icon, route, is_enabled, show_in_menu, routes_enabled, actions_enabled, sort_order, parent_id)
VALUES
  ('f0120012-0000-4000-8000-000000000001', 'admin_release_readiness', 'Release Readiness Dashboard',
   'Aggregate readiness checks across routes, tables, permissions, menus, audit, workflow, reference, migration and typecheck.',
   'CheckCircle2', '/admin/release-readiness', true, true, true, true, 7,
   'aab5fcb8-51fb-4a5c-8a87-6cef31068b47')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  route = EXCLUDED.route, icon = EXCLUDED.icon, is_enabled = EXCLUDED.is_enabled,
  show_in_menu = EXCLUDED.show_in_menu, updated_at = now();

INSERT INTO public.module_actions (id, module_id, action_name, display_name, description, is_enabled) VALUES
  ('f0120012-0000-4000-8000-000000000101','f0120012-0000-4000-8000-000000000001','view','View','View release readiness dashboard',true),
  ('f0120012-0000-4000-8000-000000000102','f0120012-0000-4000-8000-000000000001','run_checks','Run Checks','Execute readiness checks',true),
  ('f0120012-0000-4000-8000-000000000103','f0120012-0000-4000-8000-000000000001','attest','Attest','Attest a check',true),
  ('f0120012-0000-4000-8000-000000000104','f0120012-0000-4000-8000-000000000001','override','Override','Override a failing check',true),
  ('f0120012-0000-4000-8000-000000000105','f0120012-0000-4000-8000-000000000001','export','Export','Export readiness report',true),
  ('f0120012-0000-4000-8000-000000000106','f0120012-0000-4000-8000-000000000001','manage','Manage','Manage readiness configuration',true)
ON CONFLICT (id) DO NOTHING;

-- Grant to Admin + Application Admin roles
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, 'f0120012-0000-4000-8000-000000000001'::uuid, a.id, true
FROM public.roles r
CROSS JOIN public.module_actions a
WHERE r.role_name IN ('Admin','Application Admin')
  AND a.module_id = 'f0120012-0000-4000-8000-000000000001'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.module_id = 'f0120012-0000-4000-8000-000000000001'::uuid
      AND rp.action_id = a.id
  );

-- Migration audit trail
INSERT INTO public.core_audit_log (event_code, event_name, event_category, severity, risk_level,
  module_code, domain_code, entity_type, action, outcome, source, is_system_generated, notes) VALUES
  ('RELEASE_READINESS_MENU_REGISTERED','Release Readiness Menu Registered','GOVERNANCE','INFO','LOW',
   'CORE','GOVERNANCE','app_modules','REGISTER','SUCCESS','MIGRATION',true,
   'Registered /admin/release-readiness in navigation'),
  ('RELEASE_READINESS_PERMISSION_ASSIGNED','Release Readiness Permission Assigned','GOVERNANCE','INFO','MEDIUM',
   'CORE','GOVERNANCE','role_permissions','GRANT','SUCCESS','MIGRATION',true,
   'Granted Epic 12 permissions to Admin and Application Admin roles');
