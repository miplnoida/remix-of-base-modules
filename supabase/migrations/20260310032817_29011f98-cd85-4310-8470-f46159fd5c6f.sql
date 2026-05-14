
-- Insert common business logic entries for all screens based on screen type patterns
INSERT INTO dev_info_logic (screen_id, logic_type, logic_title, logic_description, execution_order)
SELECT s.id, l.logic_type, l.logic_title, l.logic_description, l.exec_order
FROM dev_info_screens s
CROSS JOIN (VALUES
  ('Permission', 'Role-Based Access Control', 'Screen access is restricted based on user role assignments. Only authorized roles can view and interact with this screen.', 1),
  ('Validation', 'Input Validation', 'All form inputs are validated against business rules before submission. Required fields, data types, and format constraints are enforced.', 2)
) AS l(logic_type, logic_title, logic_description, exec_order)
WHERE s.screen_type IN ('Entry', 'Settings')
AND NOT EXISTS (SELECT 1 FROM dev_info_logic dl WHERE dl.screen_id = s.id AND dl.logic_title = l.logic_title)
LIMIT 500;

-- Insert CRUD logic for List screens
INSERT INTO dev_info_logic (screen_id, logic_type, logic_title, logic_description, execution_order)
SELECT s.id, l.logic_type, l.logic_title, l.logic_description, l.exec_order
FROM dev_info_screens s
CROSS JOIN (VALUES
  ('Permission', 'Role-Based Access Control', 'Screen access is restricted based on user role assignments.', 1),
  ('Business Rule', 'Search and Filter', 'Supports multi-criteria search with pagination. Results are filtered based on user permissions and data scope rules.', 2),
  ('Business Rule', 'CRUD Operations', 'Create, Read, Update, and Delete operations with proper authorization checks and audit logging.', 3)
) AS l(logic_type, logic_title, logic_description, exec_order)
WHERE s.screen_type = 'List'
AND NOT EXISTS (SELECT 1 FROM dev_info_logic dl WHERE dl.screen_id = s.id AND dl.logic_title = l.logic_title)
LIMIT 800;

-- Insert report-specific logic
INSERT INTO dev_info_logic (screen_id, logic_type, logic_title, logic_description, execution_order)
SELECT s.id, l.logic_type, l.logic_title, l.logic_description, l.exec_order
FROM dev_info_screens s
CROSS JOIN (VALUES
  ('Permission', 'Report Access Control', 'Report access is restricted to authorized roles only.', 1),
  ('Business Rule', 'Data Aggregation', 'Report data is aggregated from multiple tables with configurable date ranges and filters.', 2),
  ('Business Rule', 'Export Capability', 'Reports can be exported to PDF and Excel formats with proper formatting.', 3)
) AS l(logic_type, logic_title, logic_description, exec_order)
WHERE s.screen_type = 'Report'
AND NOT EXISTS (SELECT 1 FROM dev_info_logic dl WHERE dl.screen_id = s.id AND dl.logic_title = l.logic_title)
LIMIT 200;

-- Insert module-specific logic for key modules
INSERT INTO dev_info_logic (screen_id, logic_type, logic_title, logic_description, execution_order)
SELECT s.id, l.logic_type, l.logic_title, l.logic_description, l.exec_order
FROM dev_info_screens s
CROSS JOIN (VALUES
  ('Workflow', 'Approval Workflow', 'Records follow a configurable multi-step approval workflow with role-based approver assignment.', 4),
  ('Calculation', 'Contribution Calculation', 'Contributions are calculated using configurable rates from c3_config_details including SS, EI, levy, and severance rates.', 5),
  ('Validation', 'SSN Validation', 'Social Security Numbers are validated for format, uniqueness, and age eligibility.', 6)
) AS l(logic_type, logic_title, logic_description, exec_order)
WHERE s.module_name IN ('C3 Management', 'Employers', 'Compliance')
AND NOT EXISTS (SELECT 1 FROM dev_info_logic dl WHERE dl.screen_id = s.id AND dl.logic_title = l.logic_title)
LIMIT 500;

-- Insert common actions for all screens
INSERT INTO dev_info_actions (screen_id, action_name, action_type, action_description, permission_required, tables_affected)
SELECT s.id, a.action_name, a.action_type, a.action_description, a.permission_required, a.tables_affected
FROM dev_info_screens s
CROSS JOIN (VALUES
  ('View', 'Read', 'Load and display screen data', 'Authenticated User', 'Primary table(s)'),
  ('Search', 'Read', 'Search records with multi-criteria filtering', 'Authenticated User', 'Primary table(s)')
) AS a(action_name, action_type, action_description, permission_required, tables_affected)
WHERE s.screen_type IN ('List', 'Report', 'Dashboard')
AND NOT EXISTS (SELECT 1 FROM dev_info_actions da WHERE da.screen_id = s.id AND da.action_name = a.action_name)
LIMIT 600;

-- Insert CRUD actions for entry/list screens
INSERT INTO dev_info_actions (screen_id, action_name, action_type, action_description, permission_required, tables_affected)
SELECT s.id, a.action_name, a.action_type, a.action_description, a.permission_required, a.tables_affected
FROM dev_info_screens s
CROSS JOIN (VALUES
  ('Save', 'Write', 'Save new or updated record to database with validation', 'Module User', 'Primary table(s), audit_logs'),
  ('Delete', 'Write', 'Soft delete or deactivate record with confirmation', 'Module Manager', 'Primary table(s), audit_logs'),
  ('Export', 'Read', 'Export data to Excel/PDF format', 'Module User', 'None')
) AS a(action_name, action_type, action_description, permission_required, tables_affected)
WHERE s.screen_type IN ('List', 'Entry')
AND NOT EXISTS (SELECT 1 FROM dev_info_actions da WHERE da.screen_id = s.id AND da.action_name = a.action_name)
LIMIT 800;

-- Insert approval actions for workflow-related screens
INSERT INTO dev_info_actions (screen_id, action_name, action_type, action_description, permission_required, tables_affected)
SELECT s.id, a.action_name, a.action_type, a.action_description, a.permission_required, a.tables_affected
FROM dev_info_screens s
CROSS JOIN (VALUES
  ('Submit', 'Workflow', 'Submit record for approval workflow', 'Module User', 'Primary table(s), workflow_instances'),
  ('Approve', 'Workflow', 'Approve record in workflow step', 'Approver Role', 'workflow_tasks, workflow_instances'),
  ('Reject', 'Workflow', 'Reject record with mandatory comments', 'Approver Role', 'workflow_tasks, workflow_instances')
) AS a(action_name, action_type, action_description, permission_required, tables_affected)
WHERE s.module_name IN ('Employers', 'Compliance', 'Finance', 'Legal', 'Legal Final', 'C3 Management', 'Benefits', 'NBenefit', 'NewBenefit')
AND NOT EXISTS (SELECT 1 FROM dev_info_actions da WHERE da.screen_id = s.id AND da.action_name = a.action_name)
LIMIT 800;

-- Insert audit behavior entries for all screens
INSERT INTO dev_info_audit (screen_id, audit_type, audit_description, is_enabled, remarks)
SELECT s.id, 'Change Tracking', 'All create, update, and delete operations are logged to audit_logs with user identity, timestamp, old/new values, and IP address.', true, NULL
FROM dev_info_screens s
WHERE NOT EXISTS (SELECT 1 FROM dev_info_audit da WHERE da.screen_id = s.id AND da.audit_type = 'Change Tracking')
LIMIT 600;

INSERT INTO dev_info_audit (screen_id, audit_type, audit_description, is_enabled, remarks)
SELECT s.id, 'Access Logging', 'Screen access is logged for security monitoring and compliance audit trails.', true, NULL
FROM dev_info_screens s
WHERE s.module_name IN ('Administration', 'Finance', 'Legal', 'Legal Final', 'Compliance')
AND NOT EXISTS (SELECT 1 FROM dev_info_audit da WHERE da.screen_id = s.id AND da.audit_type = 'Access Logging')
LIMIT 300;

-- Insert dependencies for all screens
INSERT INTO dev_info_dependencies (screen_id, dependency_type, dependency_name, dependency_details)
SELECT s.id, 'Service', 'Authentication Service', 'Requires active user session with valid JWT token'
FROM dev_info_screens s
WHERE s.module_name != 'Public' AND s.module_name != 'Authentication'
AND NOT EXISTS (SELECT 1 FROM dev_info_dependencies dd WHERE dd.screen_id = s.id AND dd.dependency_name = 'Authentication Service')
LIMIT 600;

INSERT INTO dev_info_dependencies (screen_id, dependency_type, dependency_name, dependency_details)
SELECT s.id, 'Service', 'Role Authorization', 'User must have appropriate role to access this screen'
FROM dev_info_screens s
WHERE s.module_name != 'Public'
AND NOT EXISTS (SELECT 1 FROM dev_info_dependencies dd WHERE dd.screen_id = s.id AND dd.dependency_name = 'Role Authorization')
LIMIT 600;
