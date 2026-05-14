
-- ============================================================
-- Phase 1: Register all missing C3-Wizard Admin modules
-- under C3 Management (parent: aa1a72a6-308c-4689-9ca1-9d732c0d6198)
-- ============================================================

-- Parent ID for C3 Management
-- aa1a72a6-308c-4689-9ca1-9d732c0d6198

-- Admin role ID (from existing role_permissions)
-- bdec06a6-cfbd-4c4e-a2be-11d6b638b948

-- ============================================================
-- 1. Top-level children under C3 Management
-- ============================================================

-- C3 Dashboard
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES ('c3010000-0000-0000-0000-000000000001', 'c3_dashboard', 'C3 Dashboard', 'LayoutDashboard', '/c3-management/dashboard', 'aa1a72a6-308c-4689-9ca1-9d732c0d6198', 5, true, 'C3-Wizard overview dashboard')
ON CONFLICT (id) DO NOTHING;

-- Employer Details
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES ('c3010000-0000-0000-0000-000000000002', 'c3_employer_details', 'Employer Details', 'Building2', '/c3-management/employer-details', 'aa1a72a6-308c-4689-9ca1-9d732c0d6198', 15, true, 'Manage employers in C3 context')
ON CONFLICT (id) DO NOTHING;

-- Self Employed Details
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES ('c3010000-0000-0000-0000-000000000003', 'c3_self_employed_details', 'Self Employed Details', 'UserCheck', '/c3-management/self-employed-details', 'aa1a72a6-308c-4689-9ca1-9d732c0d6198', 16, true, 'Manage self-employed in C3 context')
ON CONFLICT (id) DO NOTHING;

-- C3 Details (parent group)
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES ('c3010000-0000-0000-0000-000000000010', 'c3_details', 'C3 Details', 'FileText', NULL, 'aa1a72a6-308c-4689-9ca1-9d732c0d6198', 35, true, 'C3 contribution details and sub-categories')
ON CONFLICT (id) DO NOTHING;

-- Payments Details
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES ('c3010000-0000-0000-0000-000000000020', 'c3_payments_details', 'Payments Details', 'CreditCard', '/c3-management/payments', 'aa1a72a6-308c-4689-9ca1-9d732c0d6198', 45, true, 'C3 payment tracking and management')
ON CONFLICT (id) DO NOTHING;

-- Reconciliation
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES ('c3010000-0000-0000-0000-000000000021', 'c3_reconciliation', 'Reconciliation', 'ArrowLeftRight', '/c3-management/reconciliation', 'aa1a72a6-308c-4689-9ca1-9d732c0d6198', 50, true, 'Payment reconciliation for C3')
ON CONFLICT (id) DO NOTHING;

-- C3 Settings (parent group for wizard-specific settings)
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES ('c3010000-0000-0000-0000-000000000030', 'c3_wizard_settings', 'Settings', 'Settings', NULL, 'aa1a72a6-308c-4689-9ca1-9d732c0d6198', 55, true, 'C3-Wizard specific settings')
ON CONFLICT (id) DO NOTHING;

-- Manage Users (C3-scoped: Employer & SE users)
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES ('c3010000-0000-0000-0000-000000000040', 'c3_manage_users', 'Manage Users', 'Users', NULL, 'aa1a72a6-308c-4689-9ca1-9d732c0d6198', 60, true, 'Manage C3-Wizard employer and self-employed users')
ON CONFLICT (id) DO NOTHING;

-- Reports (C3-Wizard reports)
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES ('c3010000-0000-0000-0000-000000000050', 'c3_wizard_reports', 'Reports', 'BarChart2', NULL, 'aa1a72a6-308c-4689-9ca1-9d732c0d6198', 70, true, 'C3-Wizard historical reports')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Sub-items under C3 Details
-- ============================================================

-- C3 Contribution
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES ('c3010000-0000-0000-0000-000000000011', 'c3_contribution', 'C3 Contribution', 'DollarSign', '/c3-management/c3-contribution', 'c3010000-0000-0000-0000-000000000010', 10, true, 'C3 contribution entries')
ON CONFLICT (id) DO NOTHING;

-- NW Director
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES ('c3010000-0000-0000-0000-000000000012', 'c3_nw_director', 'NW Director', 'UserCog', '/c3-management/nw-director', 'c3010000-0000-0000-0000-000000000010', 20, true, 'NW Director C3 submissions')
ON CONFLICT (id) DO NOTHING;

-- Self Employed (C3 context)
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES ('c3010000-0000-0000-0000-000000000013', 'c3_self_employed_c3', 'Self Employed', 'Briefcase', '/c3-management/self-employed-c3', 'c3010000-0000-0000-0000-000000000010', 30, true, 'Self-employed C3 entries')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Sub-items under Settings
-- ============================================================

-- Self Employed Settings
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES ('c3010000-0000-0000-0000-000000000031', 'c3_self_employed_settings', 'Self Employed Settings', 'Settings2', '/c3-management/settings/self-employed', 'c3010000-0000-0000-0000-000000000030', 10, true, 'Self-employed specific C3 settings')
ON CONFLICT (id) DO NOTHING;

-- Cybersource Settings
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES ('c3010000-0000-0000-0000-000000000032', 'c3_cybersource_settings', 'Cybersource Settings', 'Plug', '/c3-management/settings/cybersource', 'c3010000-0000-0000-0000-000000000030', 20, true, 'Cybersource payment gateway configuration')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. Sub-items under Manage Users (Hybrid: C3-scoped user types)
-- ============================================================

-- Employer Users
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES ('c3010000-0000-0000-0000-000000000041', 'c3_employer_users', 'Employers', 'Building', '/c3-management/users/employers', 'c3010000-0000-0000-0000-000000000040', 10, true, 'Manage employer portal users')
ON CONFLICT (id) DO NOTHING;

-- Self Employed Users
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES ('c3010000-0000-0000-0000-000000000042', 'c3_self_employed_users', 'Self Employed', 'UserCheck', '/c3-management/users/self-employed', 'c3010000-0000-0000-0000-000000000040', 20, true, 'Manage self-employed portal users')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. Sub-items under Reports
-- ============================================================

-- Employer History
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES ('c3010000-0000-0000-0000-000000000051', 'c3_report_employer_history', 'Employer History', 'Building2', '/c3-management/reports/employer-history', 'c3010000-0000-0000-0000-000000000050', 10, true, 'Employer C3 history report')
ON CONFLICT (id) DO NOTHING;

-- Self Employed History
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES ('c3010000-0000-0000-0000-000000000052', 'c3_report_self_employed_history', 'Self Employed History', 'UserCheck', '/c3-management/reports/self-employed-history', 'c3010000-0000-0000-0000-000000000050', 20, true, 'Self-employed C3 history report')
ON CONFLICT (id) DO NOTHING;

-- Payments History
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES ('c3010000-0000-0000-0000-000000000053', 'c3_report_payments_history', 'Payments History', 'CreditCard', '/c3-management/reports/payments-history', 'c3010000-0000-0000-0000-000000000050', 30, true, 'Payment history report')
ON CONFLICT (id) DO NOTHING;

-- Reconciliation History
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES ('c3010000-0000-0000-0000-000000000054', 'c3_report_reconciliation_history', 'Reconciliation History', 'ArrowLeftRight', '/c3-management/reports/reconciliation-history', 'c3010000-0000-0000-0000-000000000050', 40, true, 'Reconciliation history report')
ON CONFLICT (id) DO NOTHING;

-- Users History
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES ('c3010000-0000-0000-0000-000000000055', 'c3_report_users_history', 'Users History', 'Users', '/c3-management/reports/users-history', 'c3010000-0000-0000-0000-000000000050', 50, true, 'C3-Wizard users history report')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. Create module_actions (view) for all new modules
-- ============================================================

INSERT INTO module_actions (id, module_id, action_name, display_name, description, is_enabled)
VALUES
  (gen_random_uuid(), 'c3010000-0000-0000-0000-000000000001', 'view', 'View', 'View C3 Dashboard', true),
  (gen_random_uuid(), 'c3010000-0000-0000-0000-000000000002', 'view', 'View', 'View Employer Details', true),
  (gen_random_uuid(), 'c3010000-0000-0000-0000-000000000003', 'view', 'View', 'View Self Employed Details', true),
  (gen_random_uuid(), 'c3010000-0000-0000-0000-000000000010', 'view', 'View', 'View C3 Details', true),
  (gen_random_uuid(), 'c3010000-0000-0000-0000-000000000011', 'view', 'View', 'View C3 Contribution', true),
  (gen_random_uuid(), 'c3010000-0000-0000-0000-000000000012', 'view', 'View', 'View NW Director', true),
  (gen_random_uuid(), 'c3010000-0000-0000-0000-000000000013', 'view', 'View', 'View Self Employed C3', true),
  (gen_random_uuid(), 'c3010000-0000-0000-0000-000000000020', 'view', 'View', 'View Payments Details', true),
  (gen_random_uuid(), 'c3010000-0000-0000-0000-000000000021', 'view', 'View', 'View Reconciliation', true),
  (gen_random_uuid(), 'c3010000-0000-0000-0000-000000000030', 'view', 'View', 'View Settings', true),
  (gen_random_uuid(), 'c3010000-0000-0000-0000-000000000031', 'view', 'View', 'View Self Employed Settings', true),
  (gen_random_uuid(), 'c3010000-0000-0000-0000-000000000032', 'view', 'View', 'View Cybersource Settings', true),
  (gen_random_uuid(), 'c3010000-0000-0000-0000-000000000040', 'view', 'View', 'View Manage Users', true),
  (gen_random_uuid(), 'c3010000-0000-0000-0000-000000000041', 'view', 'View', 'View Employer Users', true),
  (gen_random_uuid(), 'c3010000-0000-0000-0000-000000000042', 'view', 'View', 'View Self Employed Users', true),
  (gen_random_uuid(), 'c3010000-0000-0000-0000-000000000050', 'view', 'View', 'View Reports', true),
  (gen_random_uuid(), 'c3010000-0000-0000-0000-000000000051', 'view', 'View', 'View Employer History', true),
  (gen_random_uuid(), 'c3010000-0000-0000-0000-000000000052', 'view', 'View', 'View Self Employed History', true),
  (gen_random_uuid(), 'c3010000-0000-0000-0000-000000000053', 'view', 'View', 'View Payments History', true),
  (gen_random_uuid(), 'c3010000-0000-0000-0000-000000000054', 'view', 'View', 'View Reconciliation History', true),
  (gen_random_uuid(), 'c3010000-0000-0000-0000-000000000055', 'view', 'View', 'View Users History', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. Grant all new module_actions to Admin role
-- ============================================================

INSERT INTO role_permissions (id, role_id, module_id, action_id, is_granted, created_by)
SELECT 
  gen_random_uuid(),
  'bdec06a6-cfbd-4c4e-a2be-11d6b638b948',  -- Admin role
  ma.module_id,
  ma.id,
  true,
  NULL
FROM module_actions ma
WHERE ma.module_id IN (
  'c3010000-0000-0000-0000-000000000001',
  'c3010000-0000-0000-0000-000000000002',
  'c3010000-0000-0000-0000-000000000003',
  'c3010000-0000-0000-0000-000000000010',
  'c3010000-0000-0000-0000-000000000011',
  'c3010000-0000-0000-0000-000000000012',
  'c3010000-0000-0000-0000-000000000013',
  'c3010000-0000-0000-0000-000000000020',
  'c3010000-0000-0000-0000-000000000021',
  'c3010000-0000-0000-0000-000000000030',
  'c3010000-0000-0000-0000-000000000031',
  'c3010000-0000-0000-0000-000000000032',
  'c3010000-0000-0000-0000-000000000040',
  'c3010000-0000-0000-0000-000000000041',
  'c3010000-0000-0000-0000-000000000042',
  'c3010000-0000-0000-0000-000000000050',
  'c3010000-0000-0000-0000-000000000051',
  'c3010000-0000-0000-0000-000000000052',
  'c3010000-0000-0000-0000-000000000053',
  'c3010000-0000-0000-0000-000000000054',
  'c3010000-0000-0000-0000-000000000055'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.role_id = 'bdec06a6-cfbd-4c4e-a2be-11d6b638b948' 
    AND rp.module_id = ma.module_id 
    AND rp.action_id = ma.id
);
