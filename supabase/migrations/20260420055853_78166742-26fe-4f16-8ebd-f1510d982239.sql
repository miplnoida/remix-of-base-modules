-- =========================================================
-- Compliance & Enforcement — Field menu restructure (nav only)
-- =========================================================

-- 1. Create 4 sub-group containers under Field
INSERT INTO app_modules (id, name, display_name, parent_id, route, routes_enabled, show_in_menu, is_enabled, sort_order, icon)
VALUES
  ('ca000000-0000-0000-0000-0000000002a1','ce_field_plans','Plans','ca000000-0000-0000-0000-000000000200',NULL,false,true,true,10,'ClipboardList'),
  ('ca000000-0000-0000-0000-0000000002a2','ce_field_visits','Visits & Execution','ca000000-0000-0000-0000-000000000200',NULL,false,true,true,20,'MapPin'),
  ('ca000000-0000-0000-0000-0000000002a3','ce_field_employer_grp','Employer','ca000000-0000-0000-0000-000000000200',NULL,false,true,true,30,'Building2'),
  ('ca000000-0000-0000-0000-0000000002a4','ce_field_findings_grp','Findings & Reports','ca000000-0000-0000-0000-000000000200',NULL,false,true,true,40,'FileText')
ON CONFLICT (id) DO UPDATE SET
  display_name=EXCLUDED.display_name, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order,
  show_in_menu=true, is_enabled=true, routes_enabled=false, route=NULL;

-- 2. Reparent existing items under sub-groups + rename
-- Plans
UPDATE app_modules SET parent_id='ca000000-0000-0000-0000-0000000002a1', sort_order=10, display_name='Plan Builder' WHERE id='ca000000-0000-0000-0000-000000000041';
UPDATE app_modules SET parent_id='ca000000-0000-0000-0000-0000000002a1', sort_order=20, display_name='My Plans' WHERE id='ca000000-0000-0000-0000-000000000042';
UPDATE app_modules SET parent_id='ca000000-0000-0000-0000-0000000002a1', sort_order=30, display_name='Plan Approvals' WHERE id='ca000000-0000-0000-0000-000000000043';

-- Visits & Execution
UPDATE app_modules SET parent_id='ca000000-0000-0000-0000-0000000002a2', sort_order=10, display_name='Visit Workspace' WHERE id='ca000000-0000-0000-0000-000000000034';
UPDATE app_modules SET parent_id='ca000000-0000-0000-0000-0000000002a2', sort_order=20, display_name='Audits' WHERE id='ca000000-0000-0000-0000-000000000212';

-- Employer
UPDATE app_modules SET parent_id='ca000000-0000-0000-0000-0000000002a3', sort_order=10, display_name='Employer 360°' WHERE id='ca000000-0000-0000-0000-000000000210';
UPDATE app_modules SET parent_id='ca000000-0000-0000-0000-0000000002a3', sort_order=20, display_name='Employer Statements' WHERE id='ca000000-0000-0000-0000-000000000141';

-- Findings & Reports
UPDATE app_modules SET parent_id='ca000000-0000-0000-0000-0000000002a4', sort_order=10, display_name='Findings' WHERE id='ca000000-0000-0000-0000-000000000031';
UPDATE app_modules SET parent_id='ca000000-0000-0000-0000-0000000002a4', sort_order=20, display_name='Submit Weekly Report' WHERE id='ca000000-0000-0000-0000-000000000214';
UPDATE app_modules SET parent_id='ca000000-0000-0000-0000-0000000002a4', sort_order=30, display_name='Weekly Reports' WHERE id='ca000000-0000-0000-0000-000000000048';
UPDATE app_modules SET parent_id='ca000000-0000-0000-0000-0000000002a4', sort_order=40, display_name='Report Approvals' WHERE id='ca000000-0000-0000-0000-000000000215';

-- Sampling stays directly under Field
UPDATE app_modules SET parent_id='ca000000-0000-0000-0000-000000000200', sort_order=50, display_name='Sampling' WHERE id='ca000000-0000-0000-0000-000000000151';

-- 3. Hide duplicates from menu (routes preserved)
UPDATE app_modules SET show_in_menu=false WHERE id IN (
  'ca000000-0000-0000-0000-000000000044', -- Field Execution (legacy)
  'ca000000-0000-0000-0000-000000000045', -- Weekly Report Submission (dup)
  'ca000000-0000-0000-0000-000000000153', -- Upcoming Audits (dup of Sampling)
  'ca000000-0000-0000-0000-000000000047', -- legacy Weekly Reports
  'ca000000-0000-0000-0000-000000000213', -- My Upcoming Audits
  'ca000000-0000-0000-0000-000000000152'  -- Monthly Candidates
);

-- 4. Add 'view' action for new containers
INSERT INTO module_actions (id, module_id, action_name, display_name, is_enabled)
SELECT gen_random_uuid(), m.id, 'view', 'View', true
FROM app_modules m
WHERE m.id IN (
  'ca000000-0000-0000-0000-0000000002a1',
  'ca000000-0000-0000-0000-0000000002a2',
  'ca000000-0000-0000-0000-0000000002a3',
  'ca000000-0000-0000-0000-0000000002a4'
)
AND NOT EXISTS (SELECT 1 FROM module_actions ma WHERE ma.module_id=m.id AND ma.action_name='view');

-- 5. Grant containers to all 3 compliance roles
INSERT INTO role_permissions (id, role_id, module_id, action_id, is_granted)
SELECT gen_random_uuid(), r.id, ma.module_id, ma.id, true
FROM module_actions ma
CROSS JOIN roles r
WHERE ma.module_id IN (
  'ca000000-0000-0000-0000-0000000002a1',
  'ca000000-0000-0000-0000-0000000002a2',
  'ca000000-0000-0000-0000-0000000002a3',
  'ca000000-0000-0000-0000-0000000002a4'
)
AND ma.action_name='view'
AND r.role_name IN ('ComplianceInspector','SeniorInspector','ComplianceHead')
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp WHERE rp.role_id=r.id AND rp.action_id=ma.id
);

-- 6. Revoke Inspector access to senior-only items
UPDATE role_permissions
SET is_granted=false
WHERE role_id='cc000000-0000-0000-0000-000000000001'
  AND module_id IN (
    'ca000000-0000-0000-0000-000000000043', -- Plan Approvals
    'ca000000-0000-0000-0000-000000000215', -- Report Approvals
    'ca000000-0000-0000-0000-000000000151', -- Sampling
    'ca000000-0000-0000-0000-000000000141'  -- Employer Statements
  );
