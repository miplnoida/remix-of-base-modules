-- Insert Applications Review module
INSERT INTO app_modules (id, name, display_name, description, icon, route, sort_order, is_enabled, parent_id)
VALUES (
  gen_random_uuid(),
  'applications_review',
  'Applications for Review',
  'Review and process pending workflow applications',
  'ClipboardCheck',
  '/workflow/applications-review',
  5,
  true,
  NULL
);

-- Insert Workflow Instances module under System Administration
INSERT INTO app_modules (id, name, display_name, description, icon, route, sort_order, is_enabled, parent_id)
SELECT 
  gen_random_uuid(),
  'workflow_instances',
  'Workflow Instances',
  'View and manage all workflow instances',
  'History',
  '/admin/workflow-instances',
  55,
  true,
  id
FROM app_modules WHERE name = 'system_administration';

-- Create module actions for applications_review
INSERT INTO module_actions (id, module_id, action_name, display_name, description, is_enabled)
SELECT 
  gen_random_uuid(),
  m.id,
  'view',
  'View',
  'View applications for review',
  true
FROM app_modules m WHERE m.name = 'applications_review';

INSERT INTO module_actions (id, module_id, action_name, display_name, description, is_enabled)
SELECT 
  gen_random_uuid(),
  m.id,
  'process',
  'Process',
  'Process review actions on applications',
  true
FROM app_modules m WHERE m.name = 'applications_review';

-- Create module actions for workflow_instances
INSERT INTO module_actions (id, module_id, action_name, display_name, description, is_enabled)
SELECT 
  gen_random_uuid(),
  m.id,
  'view',
  'View',
  'View workflow instances',
  true
FROM app_modules m WHERE m.name = 'workflow_instances';

INSERT INTO module_actions (id, module_id, action_name, display_name, description, is_enabled)
SELECT 
  gen_random_uuid(),
  m.id,
  'export',
  'Export',
  'Export workflow instances data',
  true
FROM app_modules m WHERE m.name = 'workflow_instances';

-- Grant permissions for applications_review to Clerk, FinanceManager, Admin
INSERT INTO role_permissions (role, module_id, action_id, is_granted)
SELECT 'Clerk'::app_role, m.id, ma.id, true
FROM app_modules m
JOIN module_actions ma ON ma.module_id = m.id
WHERE m.name = 'applications_review' AND ma.action_name IN ('view', 'process');

INSERT INTO role_permissions (role, module_id, action_id, is_granted)
SELECT 'FinanceManager'::app_role, m.id, ma.id, true
FROM app_modules m
JOIN module_actions ma ON ma.module_id = m.id
WHERE m.name = 'applications_review' AND ma.action_name IN ('view', 'process');

-- Grant all workflow_instances permissions to Admin (auto-granted by trigger, but explicit for clarity)
INSERT INTO role_permissions (role, module_id, action_id, is_granted)
SELECT 'Admin'::app_role, m.id, ma.id, true
FROM app_modules m
JOIN module_actions ma ON ma.module_id = m.id
WHERE m.name = 'workflow_instances'
ON CONFLICT (role, module_id, action_id) DO UPDATE SET is_granted = true;