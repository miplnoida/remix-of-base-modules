
-- Insert table maps for major screens based on module
INSERT INTO dev_info_table_maps (screen_id, table_name, table_type, purpose, remarks)
SELECT s.id, t.table_name, t.table_type, t.purpose, NULL
FROM dev_info_screens s
CROSS JOIN (VALUES
  -- Administration tables
  ('profiles', 'Primary', 'User profile data storage'),
  ('user_roles', 'Primary', 'Role assignments for users'),
  ('audit_logs', 'Audit', 'System-wide audit trail'),
  ('app_modules', 'Secondary', 'Module registry and configuration')
) AS t(table_name, table_type, purpose)
WHERE s.module_name = 'Administration'
AND NOT EXISTS (SELECT 1 FROM dev_info_table_maps tm WHERE tm.screen_id = s.id AND tm.table_name = t.table_name)
LIMIT 300;

-- Insert table maps for Employers module
INSERT INTO dev_info_table_maps (screen_id, table_name, table_type, purpose, remarks)
SELECT s.id, t.table_name, t.table_type, t.purpose, NULL
FROM dev_info_screens s
CROSS JOIN (VALUES
  ('bema_registrations', 'Primary', 'Employer registration records'),
  ('bema_contributors', 'Secondary', 'Contributor records linked to employers'),
  ('bema_c3_submissions', 'Secondary', 'C3 submission records for employers'),
  ('bema_arrears_ledger', 'Secondary', 'Employer arrears and outstanding balances'),
  ('audit_logs', 'Audit', 'Audit trail for employer operations')
) AS t(table_name, table_type, purpose)
WHERE s.module_name IN ('Employers', 'Employer', 'Employer Registration')
AND NOT EXISTS (SELECT 1 FROM dev_info_table_maps tm WHERE tm.screen_id = s.id AND tm.table_name = t.table_name)
LIMIT 300;

-- Insert table maps for C3 Management
INSERT INTO dev_info_table_maps (screen_id, table_name, table_type, purpose, remarks)
SELECT s.id, t.table_name, t.table_type, t.purpose, NULL
FROM dev_info_screens s
CROSS JOIN (VALUES
  ('bema_c3_submissions', 'Primary', 'C3 contribution return submissions'),
  ('bema_c3_line_items', 'Primary', 'Individual employee line items within C3 submissions'),
  ('c3_calculation_config', 'Secondary', 'Calculation parameters for contributions'),
  ('c3_config_periods', 'Secondary', 'Configuration period definitions'),
  ('c3_config_details', 'Secondary', 'Detailed rate and threshold settings'),
  ('audit_logs', 'Audit', 'Audit trail for C3 operations')
) AS t(table_name, table_type, purpose)
WHERE s.module_name = 'C3 Management'
AND NOT EXISTS (SELECT 1 FROM dev_info_table_maps tm WHERE tm.screen_id = s.id AND tm.table_name = t.table_name)
LIMIT 300;

-- Insert table maps for Compliance
INSERT INTO dev_info_table_maps (screen_id, table_name, table_type, purpose, remarks)
SELECT s.id, t.table_name, t.table_type, t.purpose, NULL
FROM dev_info_screens s
CROSS JOIN (VALUES
  ('bema_audit_cases', 'Primary', 'Compliance audit case records'),
  ('bema_field_activities', 'Primary', 'Field inspection and activity records'),
  ('bema_arrears_ledger', 'Secondary', 'Arrears tracking for compliance monitoring'),
  ('bema_payment_plans', 'Secondary', 'Payment plan arrangements for arrears'),
  ('bema_waivers', 'Secondary', 'Penalty and interest waiver requests'),
  ('bema_employee_interviews', 'Secondary', 'Employee interview records during audits'),
  ('audit_logs', 'Audit', 'Audit trail for compliance operations')
) AS t(table_name, table_type, purpose)
WHERE s.module_name = 'Compliance'
AND NOT EXISTS (SELECT 1 FROM dev_info_table_maps tm WHERE tm.screen_id = s.id AND tm.table_name = t.table_name)
LIMIT 420;

-- Insert table maps for Finance
INSERT INTO dev_info_table_maps (screen_id, table_name, table_type, purpose, remarks)
SELECT s.id, t.table_name, t.table_type, t.purpose, NULL
FROM dev_info_screens s
CROSS JOIN (VALUES
  ('bema_arrears_ledger', 'Primary', 'Financial ledger for contributions and arrears'),
  ('bema_installments', 'Secondary', 'Payment plan installment records'),
  ('bema_vouchers', 'Secondary', 'Payment voucher records'),
  ('audit_logs', 'Audit', 'Audit trail for financial transactions')
) AS t(table_name, table_type, purpose)
WHERE s.module_name = 'Finance'
AND NOT EXISTS (SELECT 1 FROM dev_info_table_maps tm WHERE tm.screen_id = s.id AND tm.table_name = t.table_name)
LIMIT 200;

-- Insert table maps for Internal Audit
INSERT INTO dev_info_table_maps (screen_id, table_name, table_type, purpose, remarks)
SELECT s.id, t.table_name, t.table_type, t.purpose, NULL
FROM dev_info_screens s
CROSS JOIN (VALUES
  ('compliance_audits', 'Primary', 'Internal audit engagement records'),
  ('audit_interviews', 'Secondary', 'Audit interview records'),
  ('audit_logs', 'Audit', 'System audit trail')
) AS t(table_name, table_type, purpose)
WHERE s.module_name = 'Internal Audit'
AND NOT EXISTS (SELECT 1 FROM dev_info_table_maps tm WHERE tm.screen_id = s.id AND tm.table_name = t.table_name)
LIMIT 120;

-- Insert table maps for Legal
INSERT INTO dev_info_table_maps (screen_id, table_name, table_type, purpose, remarks)
SELECT s.id, t.table_name, t.table_type, t.purpose, NULL
FROM dev_info_screens s
CROSS JOIN (VALUES
  ('bema_audit_cases', 'Secondary', 'Compliance cases escalated to legal'),
  ('bema_arrears_ledger', 'Secondary', 'Outstanding arrears under legal action'),
  ('bema_waivers', 'Secondary', 'Waiver requests requiring legal review'),
  ('audit_logs', 'Audit', 'Audit trail for legal operations')
) AS t(table_name, table_type, purpose)
WHERE s.module_name IN ('Legal', 'Legal Final')
AND NOT EXISTS (SELECT 1 FROM dev_info_table_maps tm WHERE tm.screen_id = s.id AND tm.table_name = t.table_name)
LIMIT 200;

-- Insert table maps for Insured Persons
INSERT INTO dev_info_table_maps (screen_id, table_name, table_type, purpose, remarks)
SELECT s.id, t.table_name, t.table_type, t.purpose, NULL
FROM dev_info_screens s
CROSS JOIN (VALUES
  ('bema_contributors', 'Primary', 'Insured person / contributor records'),
  ('bema_vouchers', 'Secondary', 'Contribution vouchers for insured persons'),
  ('bema_remittance_calendar', 'Secondary', 'Remittance schedule for contributors'),
  ('audit_logs', 'Audit', 'Audit trail for insured person operations')
) AS t(table_name, table_type, purpose)
WHERE s.module_name IN ('Insured Persons', 'IP Registration')
AND NOT EXISTS (SELECT 1 FROM dev_info_table_maps tm WHERE tm.screen_id = s.id AND tm.table_name = t.table_name)
LIMIT 200;

-- Insert table maps for BeMA
INSERT INTO dev_info_table_maps (screen_id, table_name, table_type, purpose, remarks)
SELECT s.id, t.table_name, t.table_type, t.purpose, NULL
FROM dev_info_screens s
CROSS JOIN (VALUES
  ('bema_registrations', 'Primary', 'BeMA registration records'),
  ('bema_zones', 'Secondary', 'Zone definitions for inspector assignments'),
  ('bema_inspector_assignments', 'Secondary', 'Inspector zone assignments'),
  ('bema_field_activities', 'Secondary', 'Field activity records'),
  ('bema_weekly_plans', 'Secondary', 'Inspector weekly planning records')
) AS t(table_name, table_type, purpose)
WHERE s.module_name = 'BeMA'
AND NOT EXISTS (SELECT 1 FROM dev_info_table_maps tm WHERE tm.screen_id = s.id AND tm.table_name = t.table_name)
LIMIT 100;

-- Insert table maps for remaining modules (Cashier, Workflow, Notifications, etc.)
INSERT INTO dev_info_table_maps (screen_id, table_name, table_type, purpose, remarks)
SELECT s.id, t.table_name, t.table_type, t.purpose, NULL
FROM dev_info_screens s
CROSS JOIN (VALUES
  ('audit_logs', 'Audit', 'System audit trail'),
  ('profiles', 'Secondary', 'User profile information')
) AS t(table_name, table_type, purpose)
WHERE s.module_name IN ('Cashier', 'Workflow', 'Notifications', 'Templates', 'Reports', 'Medical', 'Meetings', 'Correspondence', 'Self-Employed', 'Benefits', 'NBenefit', 'NewBenefit', 'Inspector', 'Sample App', 'Online Applications', 'Registration', 'Profile', 'System Logs', 'CRD', 'Dashboard', 'External', 'Public', 'Authentication')
AND NOT EXISTS (SELECT 1 FROM dev_info_table_maps tm WHERE tm.screen_id = s.id AND tm.table_name = t.table_name)
LIMIT 500;
