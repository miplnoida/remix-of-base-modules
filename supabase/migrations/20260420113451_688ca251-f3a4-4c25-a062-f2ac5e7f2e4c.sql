
-- 1) Re-enable previously hidden Field sub-modules and ensure they show in the menu
UPDATE public.app_modules
SET is_enabled = true,
    show_in_menu = true,
    updated_at = now()
WHERE id IN (
  'ca000000-0000-0000-0000-000000000036', -- ce_field_operations
  'ca000000-0000-0000-0000-000000000033', -- ce_inspection_mgmt
  'ca000000-0000-0000-0000-000000000047', -- ce_weekly_reports
  'ca000000-0000-0000-0000-000000000213', -- ce_field_my_upcoming
  'ca000000-0000-0000-0000-000000000152'  -- ce_monthly_candidates
);

-- 2) Make sure every enabled Field child module is shown in the menu
UPDATE public.app_modules
SET show_in_menu = true,
    updated_at = now()
WHERE is_enabled = true
  AND show_in_menu = false
  AND parent_id IN (
    'ca000000-0000-0000-0000-000000000200', -- ce_field
    'ca000000-0000-0000-0000-0000000002a1', -- Plans
    'ca000000-0000-0000-0000-0000000002a2', -- Visits & Execution
    'ca000000-0000-0000-0000-0000000002a3', -- Employer
    'ca000000-0000-0000-0000-0000000002a4'  -- Findings & Reports
  );

-- 3) Ensure a 'view' module_action exists for every Field module
INSERT INTO public.module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, 'view', 'View', 'View access to ' || m.display_name, true
FROM public.app_modules m
WHERE (m.id = 'ca000000-0000-0000-0000-000000000200'
       OR m.parent_id IN (
         'ca000000-0000-0000-0000-000000000200',
         'ca000000-0000-0000-0000-0000000002a1',
         'ca000000-0000-0000-0000-0000000002a2',
         'ca000000-0000-0000-0000-0000000002a3',
         'ca000000-0000-0000-0000-0000000002a4'
       ))
  AND NOT EXISTS (
    SELECT 1 FROM public.module_actions ma
    WHERE ma.module_id = m.id AND ma.action_name = 'view'
  );

-- 4) Grant 'view' permission on every enabled Field module to the three operational compliance roles
WITH field_modules AS (
  SELECT id FROM public.app_modules
  WHERE is_enabled = true
    AND (id = 'ca000000-0000-0000-0000-000000000200'
         OR parent_id IN (
           'ca000000-0000-0000-0000-000000000200',
           'ca000000-0000-0000-0000-0000000002a1',
           'ca000000-0000-0000-0000-0000000002a2',
           'ca000000-0000-0000-0000-0000000002a3',
           'ca000000-0000-0000-0000-0000000002a4'
         ))
),
target_roles AS (
  SELECT id FROM public.roles
  WHERE role_name IN ('ComplianceInspector','SeniorInspector','ComplianceHead')
),
view_actions AS (
  SELECT ma.id AS action_id, ma.module_id
  FROM public.module_actions ma
  WHERE ma.action_name = 'view'
    AND ma.module_id IN (SELECT id FROM field_modules)
)
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, va.module_id, va.action_id, true
FROM target_roles r
CROSS JOIN view_actions va
ON CONFLICT (role_id, module_id, action_id) DO UPDATE SET is_granted = true;
