-- Epic OM-4: Organisation vs Communication & Template Management domain split.

-- 0) Ensure COMMUNICATION admin domain exists (idempotent).
INSERT INTO public.core_admin_domain_registry (domain_code, domain_name, description, is_active)
VALUES ('COMMUNICATION','Communication & Template Management','Communication assets, template library, advanced configuration, and validation/impact tooling.',true)
ON CONFLICT (domain_code) DO NOTHING;

-- 1) Register the new Communication & Template Management route (idempotent).
INSERT INTO public.core_admin_route_registry
  (route_path, page_name, admin_domain, canonical_status, owner_module_code,
   requires_permission, show_in_platform_admin, is_active, description)
VALUES
  ('/admin/template-management',
   'Communication & Template Management',
   'COMMUNICATION',
   'CANONICAL',
   'CORE',
   'core.admin.org.templates.view',
   true,
   true,
   'Communication & Template Management shell — media, brand layouts, template library, advanced configuration, validation/impact (Epic OM-4).')
ON CONFLICT (route_path) DO UPDATE SET
  page_name = EXCLUDED.page_name,
  admin_domain = EXCLUDED.admin_domain,
  canonical_status = EXCLUDED.canonical_status,
  owner_module_code = EXCLUDED.owner_module_code,
  requires_permission = EXCLUDED.requires_permission,
  show_in_platform_admin = EXCLUDED.show_in_platform_admin,
  is_active = EXCLUDED.is_active,
  description = EXCLUDED.description,
  updated_at = now();

-- 2) Seed OM-4 governance audit event types (idempotent).
INSERT INTO public.core_audit_event_type
  (event_code, event_name, module_code, domain_code, event_category,
   default_severity, default_risk_level,
   is_admin_event, is_security_event, is_migration_event,
   is_pii_event, is_financial_event, requires_before_after)
VALUES
  ('ORG_DOMAIN_SPLIT_ROUTE_REGISTERED',        'OM-4 Organisation Route Registered',                'CORE','ORGANIZATION','CONFIGURATION','INFO','LOW', true,false,false,false,false,false),
  ('ORG_DOMAIN_SPLIT_MENU_UPDATED',            'OM-4 Organisation Menu Updated',                    'CORE','ORGANIZATION','CONFIGURATION','INFO','LOW', true,false,false,false,false,false),
  ('COMM_TEMPLATE_MANAGEMENT_ROUTE_REGISTERED','OM-4 Communication & Template Route Registered',    'CORE','ORGANIZATION','CONFIGURATION','INFO','LOW', true,false,false,false,false,false),
  ('COMM_TEMPLATE_MANAGEMENT_MENU_REGISTERED', 'OM-4 Communication & Template Menu Registered',     'CORE','ORGANIZATION','CONFIGURATION','INFO','LOW', true,false,false,false,false,false),
  ('ORG_DOMAIN_NAVIGATION_REGROUPED',          'OM-4 Organisation Navigation Regrouped',            'CORE','ORGANIZATION','CONFIGURATION','INFO','LOW', true,false,false,false,false,false),
  ('ORG_DOMAIN_SPLIT_VERIFIED',                'OM-4 Organisation Domain Split Verified',           'CORE','ORGANIZATION','CONFIGURATION','INFO','MEDIUM', true,false,false,false,false,false)
ON CONFLICT (event_code) DO UPDATE
SET event_name = EXCLUDED.event_name,
    is_active = true;
