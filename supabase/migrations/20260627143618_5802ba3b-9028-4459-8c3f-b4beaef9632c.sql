
-- Phase 2: Enterprise Administration regrouping
-- Creates 7 logical groups under "Administration" and reparents existing admin children.
-- Original parent_id values are preserved in app_modules_reorg_backup for rollback.

CREATE TABLE IF NOT EXISTS public.app_modules_reorg_backup (
  id uuid PRIMARY KEY,
  name text,
  display_name text,
  prior_parent_id uuid,
  prior_sort_order integer,
  backed_up_at timestamptz NOT NULL DEFAULT now(),
  reorg_tag text NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_modules_reorg_backup TO authenticated;
GRANT ALL ON public.app_modules_reorg_backup TO service_role;

-- Snapshot current admin children before any change
INSERT INTO public.app_modules_reorg_backup (id, name, display_name, prior_parent_id, prior_sort_order, reorg_tag)
SELECT id, name, display_name, parent_id, sort_order, 'phase2-enterprise-admin-2026-06-27'
FROM public.app_modules
WHERE parent_id = 'aab5fcb8-51fb-4a5c-8a87-6cef31068b47'
ON CONFLICT (id) DO NOTHING;

-- Create 7 enterprise groups under Administration (stable UUIDs)
INSERT INTO public.app_modules (id, name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu)
VALUES
  ('e1a00000-0000-4000-8000-000000000001', 'admin_organization',     'Organization Management',        'Enterprise organization, departments, branding, policies, AI context', 'Building2',   NULL, 'aab5fcb8-51fb-4a5c-8a87-6cef31068b47',  10, true, true),
  ('e1a00000-0000-4000-8000-000000000002', 'admin_identity_security','Identity & Security',            'Users, roles, permissions, MFA, sessions, IP rules',                   'ShieldCheck', NULL, 'aab5fcb8-51fb-4a5c-8a87-6cef31068b47',  20, true, true),
  ('e1a00000-0000-4000-8000-000000000003', 'admin_master_data',      'Master Data',                    'Reusable lookup tables and reference values',                          'Database',    NULL, 'aab5fcb8-51fb-4a5c-8a87-6cef31068b47',  30, true, true),
  ('e1a00000-0000-4000-8000-000000000004', 'admin_workflow_automation','Workflow & Automation',        'Workflows, triggers, rules, scheduler, numbering',                     'GitBranch',   NULL, 'aab5fcb8-51fb-4a5c-8a87-6cef31068b47',  40, true, true),
  ('e1a00000-0000-4000-8000-000000000005', 'admin_comm_doc_engine',  'Communication & Document Engine','Templates, assets, text blocks, notifications, DMS',                   'Mail',        NULL, 'aab5fcb8-51fb-4a5c-8a87-6cef31068b47',  50, true, true),
  ('e1a00000-0000-4000-8000-000000000006', 'admin_integrations',     'Integrations',                   'External APIs, public API, webhooks, portal settings',                 'Plug',        NULL, 'aab5fcb8-51fb-4a5c-8a87-6cef31068b47',  60, true, true),
  ('e1a00000-0000-4000-8000-000000000007', 'admin_system',           'System Administration',          'Logs, monitoring, releases, data migration, cleanup',                  'Cog',         NULL, 'aab5fcb8-51fb-4a5c-8a87-6cef31068b47',  70, true, true)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description  = EXCLUDED.description,
  icon         = EXCLUDED.icon,
  parent_id    = EXCLUDED.parent_id,
  sort_order   = EXCLUDED.sort_order,
  is_enabled   = true,
  show_in_menu = true;

-- Reparent existing Administration children into the 7 groups

-- Identity & Security
UPDATE public.app_modules SET parent_id = 'e1a00000-0000-4000-8000-000000000002', sort_order = 10
  WHERE id = '3218b9ca-af32-493c-ac2c-3b3daa467e83'; -- user_management
UPDATE public.app_modules SET parent_id = 'e1a00000-0000-4000-8000-000000000002', sort_order = 20
  WHERE id = 'aa8faa84-147d-449a-a7db-a9dcde6aac39'; -- role_management
UPDATE public.app_modules SET parent_id = 'e1a00000-0000-4000-8000-000000000002', sort_order = 30
  WHERE id = 'a27e3956-bbd4-4305-8776-00afd1ea1b11'; -- Role Permissions
UPDATE public.app_modules SET parent_id = 'e1a00000-0000-4000-8000-000000000002', sort_order = 40
  WHERE id = 'be524792-6660-4798-8347-24513271f9e5'; -- role_hierarchy
UPDATE public.app_modules SET parent_id = 'e1a00000-0000-4000-8000-000000000002', sort_order = 50
  WHERE id = 'bbd95192-96ea-4103-8c57-48ce4284959a'; -- data_access_control
UPDATE public.app_modules SET parent_id = 'e1a00000-0000-4000-8000-000000000002', sort_order = 60
  WHERE id = '2ef141ac-874b-4fbc-8891-afc8b889d0ba'; -- update_password

-- Organization Management
UPDATE public.app_modules SET parent_id = 'e1a00000-0000-4000-8000-000000000001', sort_order = 10
  WHERE id = '7b40b5f9-6c3a-4e98-a70f-56f55cc4427a'; -- organization_management
UPDATE public.app_modules SET parent_id = 'e1a00000-0000-4000-8000-000000000001', sort_order = 20
  WHERE id = '9dcb0af0-489a-4a95-afe1-13167fad1b88'; -- module_management
UPDATE public.app_modules SET parent_id = 'e1a00000-0000-4000-8000-000000000001', sort_order = 30
  WHERE id = 'd044a9a1-379c-45bb-ac8c-0872b31275f6'; -- designation_hierarchy
UPDATE public.app_modules SET parent_id = 'e1a00000-0000-4000-8000-000000000001', sort_order = 40
  WHERE id = '9f0ae73a-c397-44f5-83fb-af851e4b4426'; -- Administration_db_diagram

-- Master Data
UPDATE public.app_modules SET parent_id = 'e1a00000-0000-4000-8000-000000000003', sort_order = 10
  WHERE id = 'd7aae631-5057-4a12-8f4c-53aca7846b60'; -- Master Data

-- Workflow & Automation
UPDATE public.app_modules SET parent_id = 'e1a00000-0000-4000-8000-000000000004', sort_order = 10
  WHERE id = 'dc808d05-7db9-4ca1-a915-f6045d9cce25'; -- workflows
UPDATE public.app_modules SET parent_id = 'e1a00000-0000-4000-8000-000000000004', sort_order = 20
  WHERE id = 'a1000000-0000-0000-0000-000000000201'; -- core_numbering_rules

-- Communication & Document Engine
UPDATE public.app_modules SET parent_id = 'e1a00000-0000-4000-8000-000000000005', sort_order = 10
  WHERE id = '4119c93f-1335-4b2f-afdc-acd45070b8ec'; -- notification_management
UPDATE public.app_modules SET parent_id = 'e1a00000-0000-4000-8000-000000000005', sort_order = 20
  WHERE id = '1e9a1000-0000-0000-0000-000000000133'; -- core_dms_admin

-- Integrations
UPDATE public.app_modules SET parent_id = 'e1a00000-0000-4000-8000-000000000006', sort_order = 10
  WHERE id = '745eb317-3965-4633-b2c6-ee752dbe5754'; -- external_apis

-- System Administration
UPDATE public.app_modules SET parent_id = 'e1a00000-0000-4000-8000-000000000007', sort_order = 10
  WHERE id = 'da5c87f0-1029-4a51-a286-a9a51800a1de'; -- system_administration
UPDATE public.app_modules SET parent_id = 'e1a00000-0000-4000-8000-000000000007', sort_order = 20
  WHERE id = 'a1000000-0000-0000-0000-000000000001'; -- system_monitoring
UPDATE public.app_modules SET parent_id = 'e1a00000-0000-4000-8000-000000000007', sort_order = 30
  WHERE id = 'f8c2e735-589f-406d-9b94-d06e22931167'; -- release_management

-- Seed leaf entries for orphan organization pages so they appear in the menu
INSERT INTO public.app_modules (id, name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu)
VALUES
  ('e1a01001-0000-4000-8000-000000000001', 'admin_org_profile',         'Organization Profile',     'Core organization settings',                'Building',     '/admin/organization/profile',              'e1a00000-0000-4000-8000-000000000001',  5, true, true),
  ('e1a01001-0000-4000-8000-000000000002', 'admin_org_locations',       'Locations & Offices',      'Branches, service centres',                 'MapPin',       '/admin/organization/locations',            'e1a00000-0000-4000-8000-000000000001', 15, true, true),
  ('e1a01001-0000-4000-8000-000000000003', 'admin_org_departments',     'Department Profiles',      'Per-department communication & docs',       'Users',        '/admin/organization/departments',          'e1a00000-0000-4000-8000-000000000001', 25, true, true),
  ('e1a01001-0000-4000-8000-000000000004', 'admin_org_portal_branding', 'Portal Branding',          'Public portal theming',                     'Palette',      '/admin/organization/portal-branding',      'e1a00000-0000-4000-8000-000000000001', 35, true, true),
  ('e1a01001-0000-4000-8000-000000000005', 'admin_org_enterprise_health','Enterprise Health',       'Configuration health dashboard',            'Activity',     '/admin/organization/enterprise-health',    'e1a00000-0000-4000-8000-000000000001', 80, true, true),
  ('e1a01001-0000-4000-8000-000000000006', 'admin_org_usage_validation','Usage Validation',         'Asset usage validation',                    'CheckCircle',  '/admin/organization/usage',                'e1a00000-0000-4000-8000-000000000001', 85, true, true),

  ('e1a01005-0000-4000-8000-000000000001', 'admin_cde_text_blocks',     'Text Blocks',              'Reusable text block library',               'FileText',     '/admin/organization/text-blocks',          'e1a00000-0000-4000-8000-000000000005',  5, true, true),
  ('e1a01005-0000-4000-8000-000000000002', 'admin_cde_comm_assets',     'Communication Assets',     'Logos, signatures, stamps',                 'Image',        '/admin/communication',                     'e1a00000-0000-4000-8000-000000000005', 15, true, true),
  ('e1a01005-0000-4000-8000-000000000003', 'admin_cde_document_assets', 'Document Assets',          'Document-bound asset slots',                'FileImage',    '/admin/organization/document-assets',      'e1a00000-0000-4000-8000-000000000005', 25, true, true),
  ('e1a01005-0000-4000-8000-000000000004', 'admin_cde_letterheads',     'Letterheads',              'Letterhead images per department',          'FileImage',    '/admin/organization/letterheads',          'e1a00000-0000-4000-8000-000000000005', 35, true, true),
  ('e1a01005-0000-4000-8000-000000000005', 'admin_cde_media_library',   'Media Library',            'Central media file store',                  'Folder',       '/admin/organization/media-library',        'e1a00000-0000-4000-8000-000000000005', 45, true, true),
  ('e1a01005-0000-4000-8000-000000000006', 'admin_cde_core_templates',  'Templates',                'Master template repository',                'LayoutTemplate','/admin/core-templates',                   'e1a00000-0000-4000-8000-000000000005', 55, true, true),
  ('e1a01005-0000-4000-8000-000000000007', 'admin_cde_org_templates',   'Notification Templates',   'Org-scoped notification template overrides','MessageSquare','/admin/organization/notification-templates','e1a00000-0000-4000-8000-000000000005', 65, true, true),
  ('e1a01005-0000-4000-8000-000000000008', 'admin_cde_doc_config',      'Document Configuration',   'Per-module document type bindings',         'FileCog',      '/admin/document-configuration',            'e1a00000-0000-4000-8000-000000000005', 75, true, true),
  ('e1a01005-0000-4000-8000-000000000009', 'admin_cde_ip_card',         'IP Card Layout',           'Insured-person ID card template',           'IdCard',       '/admin/ip-card-configuration',             'e1a00000-0000-4000-8000-000000000005', 85, true, true),

  ('e1a01002-0000-4000-8000-000000000001', 'admin_ids_password_policy', 'Password Policy',          'Password complexity & expiry',              'KeyRound',     '/admin/security/password-policy',          'e1a00000-0000-4000-8000-000000000002', 35, true, true),
  ('e1a01002-0000-4000-8000-000000000002', 'admin_ids_mfa',             'MFA Settings',             'Multi-factor authentication',               'ShieldCheck',  '/admin/security/mfa',                      'e1a00000-0000-4000-8000-000000000002', 45, true, true),
  ('e1a01002-0000-4000-8000-000000000003', 'admin_ids_security_policy', 'Security Policy',          'Rate limits, lockouts, sessions',           'Lock',         '/admin/security/policy',                   'e1a00000-0000-4000-8000-000000000002', 55, true, true),
  ('e1a01002-0000-4000-8000-000000000004', 'admin_ids_ip_access',       'IP Access Rules',          'IP whitelist / range rules',                'Network',      '/admin/security/ip-access',                'e1a00000-0000-4000-8000-000000000002', 65, true, true),
  ('e1a01002-0000-4000-8000-000000000005', 'admin_ids_api_keys',        'API Keys',                 'Generate/revoke API keys',                  'Key',          '/admin/api-keys',                          'e1a00000-0000-4000-8000-000000000002', 75, true, true),

  ('e1a01004-0000-4000-8000-000000000001', 'admin_wfa_scheduler',       'Central Scheduler',        'Cron-style job scheduling',                 'Clock',        '/admin/scheduler',                         'e1a00000-0000-4000-8000-000000000004', 30, true, true),
  ('e1a01004-0000-4000-8000-000000000002', 'admin_wfa_alloc_rules',     'Payment Allocation Rules', 'Ledger allocation rules',                   'Wallet',       '/admin/ledger/allocation-rules',           'e1a00000-0000-4000-8000-000000000004', 40, true, true),

  ('e1a01006-0000-4000-8000-000000000001', 'admin_int_public_api',      'Public API',               'Public-facing API endpoints',               'Globe',        '/admin/public-api',                        'e1a00000-0000-4000-8000-000000000006', 20, true, true),
  ('e1a01006-0000-4000-8000-000000000002', 'admin_int_api_test',        'API Test Console',         'API testing harness',                       'TestTube',     '/admin/api-test-console',                  'e1a00000-0000-4000-8000-000000000006', 30, true, true),
  ('e1a01006-0000-4000-8000-000000000003', 'admin_int_portal_settings', 'External Portal Settings', 'Employer/doctor portal feature flags',      'Settings',     '/admin/external-portal-settings',          'e1a00000-0000-4000-8000-000000000006', 40, true, true),
  ('e1a01006-0000-4000-8000-000000000004', 'admin_int_portal_approvals','External Portal Approvals','Approve external portal users',             'UserCheck',    '/admin/external-portal-approvals',         'e1a00000-0000-4000-8000-000000000006', 50, true, true),
  ('e1a01006-0000-4000-8000-000000000005', 'admin_int_api_config',      'API Configuration',        'API settings key-value store',              'Settings2',    '/admin/api-configuration',                 'e1a00000-0000-4000-8000-000000000006', 60, true, true),
  ('e1a01006-0000-4000-8000-000000000006', 'admin_int_public_catalog',  'Public Catalog Validation','Validate public API catalog',               'CheckSquare',  '/admin/public-catalog-validation',         'e1a00000-0000-4000-8000-000000000006', 70, true, true),

  ('e1a01007-0000-4000-8000-000000000001', 'admin_sys_data_migration',  'Data Migration',           'Bulk data migration tool',                  'DatabaseZap',  '/admin/data-migration',                    'e1a00000-0000-4000-8000-000000000007', 40, true, true),
  ('e1a01007-0000-4000-8000-000000000002', 'admin_sys_date_culture',    'Date/Culture Consistency', 'Locale/date format checks',                 'CalendarCheck','/admin/date-culture-consistency',          'e1a00000-0000-4000-8000-000000000007', 50, true, true),
  ('e1a01007-0000-4000-8000-000000000003', 'admin_sys_kb',              'Knowledge Base',           'Help articles, FAQs',                       'BookOpen',     '/admin/knowledge-base',                    'e1a00000-0000-4000-8000-000000000007', 60, true, true),
  ('e1a01007-0000-4000-8000-000000000004', 'admin_sys_module_bindings', 'Module Button Bindings',   'Action button bindings',                    'MousePointerClick','/admin/module-button-bindings',         'e1a00000-0000-4000-8000-000000000007', 70, true, true),
  ('e1a01007-0000-4000-8000-000000000005', 'admin_sys_qa',              'QA Dashboard',             'Quality assurance metrics',                 'CheckCircle2', '/admin/qa',                                'e1a00000-0000-4000-8000-000000000007', 80, true, true),
  ('e1a01007-0000-4000-8000-000000000006', 'admin_sys_dms_api_test',    'DMS API Test',             'DMS API test harness',                      'TestTube2',    '/admin/dms-api-test',                      'e1a00000-0000-4000-8000-000000000007', 90, true, true)
ON CONFLICT (id) DO UPDATE SET
  parent_id    = EXCLUDED.parent_id,
  sort_order   = EXCLUDED.sort_order,
  display_name = EXCLUDED.display_name,
  icon         = EXCLUDED.icon,
  route        = EXCLUDED.route,
  is_enabled   = true,
  show_in_menu = true;
