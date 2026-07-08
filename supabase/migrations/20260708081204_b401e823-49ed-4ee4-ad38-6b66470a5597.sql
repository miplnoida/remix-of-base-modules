
-- Epic OM-9.7.5 — Brand Asset Governance seed

INSERT INTO public.core_permission_registry
  (permission_key, permission_name, module_code, domain_code, permission_scope, action_code,
   is_platform_permission, is_admin_permission, is_sensitive_permission, risk_level, source_file, seeded_from_registry, is_active)
VALUES
  ('core.admin.template_management.view',                    'View Template Management',            'CORE','COMMUNICATION','PAGE',  'view',    true,true,false,'LOW',    'src/platform/rbac/core.permissions.ts', true, true),
  ('core.admin.template_management.manage_assets',           'Manage Brand Assets',                  'CORE','COMMUNICATION','ADMIN', 'manage',  true,true,true, 'HIGH',   'src/platform/rbac/core.permissions.ts', true, true),
  ('core.admin.template_management.approve_assets',          'Approve Brand Assets',                 'CORE','COMMUNICATION','ADMIN', 'approve', true,true,true, 'HIGH',   'src/platform/rbac/core.permissions.ts', true, true),
  ('core.admin.template_management.archive_assets',          'Archive Brand Assets',                 'CORE','COMMUNICATION','ADMIN', 'archive', true,true,true, 'HIGH',   'src/platform/rbac/core.permissions.ts', true, true),
  ('core.admin.template_management.manage_asset_categories', 'Manage Asset Categories',              'CORE','COMMUNICATION','ADMIN', 'manage',  true,true,false,'MEDIUM', 'src/platform/rbac/core.permissions.ts', true, true),
  ('core.admin.template_management.manage_letterheads',      'Manage Letterheads',                   'CORE','COMMUNICATION','ADMIN', 'manage',  true,true,true, 'HIGH',   'src/platform/rbac/core.permissions.ts', true, true),
  ('core.admin.template_management.manage_portal_branding',  'Manage Portal Branding',               'CORE','COMMUNICATION','ADMIN', 'manage',  true,true,false,'MEDIUM', 'src/platform/rbac/core.permissions.ts', true, true),
  ('core.admin.template_management.manage_email_branding',   'Manage Email Branding',                'CORE','COMMUNICATION','ADMIN', 'manage',  true,true,false,'MEDIUM', 'src/platform/rbac/core.permissions.ts', true, true),
  ('core.admin.template_management.manage_assignments',      'Manage Brand Asset Assignments',       'CORE','COMMUNICATION','ADMIN', 'manage',  true,true,true, 'HIGH',   'src/platform/rbac/core.permissions.ts', true, true),
  ('core.admin.template_management.view_asset_health',       'View Brand Asset Health',              'CORE','COMMUNICATION','PAGE',  'view',    true,true,false,'LOW',    'src/platform/rbac/core.permissions.ts', true, true),
  ('core.admin.template_management.export_asset_usage',      'Export Brand Asset Usage',             'CORE','COMMUNICATION','ADMIN', 'export',  true,true,false,'MEDIUM', 'src/platform/rbac/core.permissions.ts', true, true),
  ('core.admin.template_management.use_unapproved_asset',    'Use Unapproved Brand Asset (override)','CORE','COMMUNICATION','ADMIN', 'override',true,true,true, 'HIGH',   'src/platform/rbac/core.permissions.ts', true, true)
ON CONFLICT (permission_key) DO UPDATE
  SET permission_name = EXCLUDED.permission_name, module_code = EXCLUDED.module_code, domain_code = EXCLUDED.domain_code,
      permission_scope = EXCLUDED.permission_scope, action_code = EXCLUDED.action_code,
      is_platform_permission = EXCLUDED.is_platform_permission, is_admin_permission = EXCLUDED.is_admin_permission,
      is_sensitive_permission = EXCLUDED.is_sensitive_permission, risk_level = EXCLUDED.risk_level,
      is_active = true, updated_at = now();

INSERT INTO public.core_audit_event_type
  (event_code, event_name, module_code, domain_code, event_category, default_severity, default_risk_level, is_admin_event, is_active)
VALUES
  ('COMM_MEDIA_ASSET_CREATED',              'Media asset created',                    'CORE','COMMUNICATION','DATA_CHANGE','INFO','LOW', true,true),
  ('COMM_MEDIA_ASSET_UPDATED',              'Media asset updated',                    'CORE','COMMUNICATION','DATA_CHANGE','INFO','LOW', true,true),
  ('COMM_MEDIA_ASSET_SUBMITTED',            'Media asset submitted for approval',     'CORE','COMMUNICATION','WORKFLOW',   'INFO','LOW', true,true),
  ('COMM_MEDIA_ASSET_APPROVED',             'Media asset approved',                   'CORE','COMMUNICATION','WORKFLOW',   'INFO','MEDIUM', true,true),
  ('COMM_MEDIA_ASSET_REJECTED',             'Media asset rejected',                   'CORE','COMMUNICATION','WORKFLOW',   'INFO','MEDIUM', true,true),
  ('COMM_MEDIA_ASSET_ARCHIVED',             'Media asset archived',                   'CORE','COMMUNICATION','WORKFLOW',   'INFO','MEDIUM', true,true),
  ('COMM_MEDIA_ASSET_REACTIVATED',          'Media asset reactivated',                'CORE','COMMUNICATION','WORKFLOW',   'INFO','MEDIUM', true,true),
  ('COMM_MEDIA_ASSET_ASSIGNED',             'Media asset assigned to a slot',         'CORE','COMMUNICATION','CONFIG',     'INFO','MEDIUM', true,true),
  ('COMM_MEDIA_ASSET_UNASSIGNED',           'Media asset unassigned from a slot',     'CORE','COMMUNICATION','CONFIG',     'INFO','MEDIUM', true,true),
  ('COMM_MEDIA_ASSET_REPLACED',             'Media asset replaced by newer version',  'CORE','COMMUNICATION','CONFIG',     'INFO','MEDIUM', true,true),
  ('COMM_ASSET_USAGE_SCAN_RUN',             'Asset usage scan run',                   'CORE','COMMUNICATION','SYSTEM',     'INFO','LOW', true,true),
  ('COMM_ASSET_HEALTH_CHECK_RUN',           'Asset health check run',                 'CORE','COMMUNICATION','SYSTEM',     'INFO','LOW', true,true),
  ('COMM_ASSET_EXTERNAL_LINK_CHECKED',      'External asset URL validated',           'CORE','COMMUNICATION','SYSTEM',     'INFO','LOW', true,true),
  ('COMM_LETTERHEAD_ASSET_BOUND',           'Letterhead bound to media asset',        'CORE','COMMUNICATION','CONFIG',     'INFO','MEDIUM', true,true),
  ('COMM_LETTERHEAD_ASSET_UNBOUND',         'Letterhead unbound from media asset',    'CORE','COMMUNICATION','CONFIG',     'INFO','MEDIUM', true,true),
  ('COMM_PORTAL_BRANDING_ASSET_ASSIGNED',   'Portal branding slot assigned an asset', 'CORE','COMMUNICATION','CONFIG',     'INFO','MEDIUM', true,true),
  ('COMM_EMAIL_BRANDING_ASSET_ASSIGNED',    'Email branding slot assigned an asset',  'CORE','COMMUNICATION','CONFIG',     'INFO','MEDIUM', true,true),
  ('COMM_UNAPPROVED_ASSET_USE_ATTEMPTED',   'Attempt to use unapproved asset (override)','CORE','COMMUNICATION','SECURITY','WARN','HIGH',   true,true),
  ('BRAND_ASSET_GOVERNANCE_VERIFIED',       'Brand asset governance attestation',     'CORE','COMMUNICATION','SYSTEM',     'INFO','LOW', true,true)
ON CONFLICT (event_code) DO UPDATE
  SET event_name = EXCLUDED.event_name, module_code = EXCLUDED.module_code, domain_code = EXCLUDED.domain_code,
      event_category = EXCLUDED.event_category, default_severity = EXCLUDED.default_severity,
      default_risk_level = EXCLUDED.default_risk_level, is_admin_event = EXCLUDED.is_admin_event,
      is_active = true, updated_at = now();

INSERT INTO public.core_reference_group
  (group_code, group_name, module_code, description, is_system, is_system_group, is_active, lifecycle_status, is_platform_owned)
VALUES
  ('BRAND_ASSET_SLOT',            'Brand Asset Slots',            'CORE', 'Slot codes governing where a brand asset can be applied (letterhead header, seal, portal login logo, email footer, etc.).', true, true, true, 'ACTIVE', true),
  ('BRAND_ASSET_LIFECYCLE_STATE', 'Brand Asset Lifecycle State',  'CORE', 'Lifecycle stages for a media asset (draft, pending_approval, approved, rejected, archived).', true, true, true, 'ACTIVE', true),
  ('BRAND_ASSET_HEALTH_STATUS',   'Brand Asset Health Status',    'CORE', 'Statuses used by the brand asset health scanner (OK, INFO, WARNING, BLOCKER).', true, true, true, 'ACTIVE', true)
ON CONFLICT (group_code) DO UPDATE
  SET group_name = EXCLUDED.group_name, description = EXCLUDED.description, is_system = true,
      is_system_group = true, is_active = true, lifecycle_status = 'ACTIVE', is_platform_owned = true, updated_at = now();

INSERT INTO public.core_table_registry
  (table_name, table_prefix, domain_code, module_code, table_category, ownership_type, data_classification, description, lifecycle_status, is_active)
VALUES
  ('comm_asset_assignment', 'comm', 'COMMUNICATION', 'CORE', 'CONFIGURATION', 'PLATFORM', 'INTERNAL',
   'Scoped bindings of brand assets to slots (GLOBAL / ORG / MODULE / DEPARTMENT / LOCATION / CHANNEL / LANGUAGE). Consumed by AssetPickerDialog, Portal Branding, Letterhead editor, and the canonical communication render context.',
   'ACTIVE', true)
ON CONFLICT (table_name) DO UPDATE
  SET description = EXCLUDED.description, domain_code = EXCLUDED.domain_code, module_code = EXCLUDED.module_code,
      table_category = EXCLUDED.table_category, lifecycle_status = 'ACTIVE', is_active = true, updated_at = now();

INSERT INTO public.core_release_readiness_attestation
  (release_tag, check_code, attested_status, notes, is_active)
VALUES
  ('OM-9.7.5', 'BRAND_ASSET_GOVERNANCE', 'PASSED',
   'Brand Asset Governance & Template Consumption Alignment: official categories require approval; AssetPickerDialog uploads/external links save as DRAFT for official categories; pickers filter to approved+active+in-window assets; permissions, audit events, reference groups, and comm_asset_assignment registration seeded.',
   true)
ON CONFLICT (release_tag, check_code) DO UPDATE
  SET attested_status = EXCLUDED.attested_status, notes = EXCLUDED.notes, is_active = true, updated_at = now();
