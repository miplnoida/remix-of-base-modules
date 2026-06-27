
-- Add Enterprise Configuration Health page to Organization Management menu + grants

WITH new_module AS (
  INSERT INTO public.app_modules (name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu)
  VALUES (
    'org_enterprise_health',
    'Enterprise Configuration Health',
    'Read-only diagnostics across the communication & branding stack.',
    'Activity',
    '/admin/organization/enterprise-health',
    '7b40b5f9-6c3a-4e98-a70f-56f55cc4427a',
    110,
    true,
    true
  )
  ON CONFLICT (name) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        route = EXCLUDED.route,
        parent_id = EXCLUDED.parent_id,
        sort_order = EXCLUDED.sort_order,
        is_enabled = true,
        show_in_menu = true
  RETURNING id
),
view_action AS (
  INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
  SELECT id, 'view', 'View', true FROM new_module
  ON CONFLICT (module_id, action_name) DO UPDATE SET is_enabled = true
  RETURNING id, module_id
),
manage_action AS (
  INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
  SELECT id, 'manage', 'Manage', true FROM new_module
  ON CONFLICT (module_id, action_name) DO UPDATE SET is_enabled = true
  RETURNING id, module_id
)
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, a.module_id, a.id, true
FROM roles r
CROSS JOIN (SELECT id, module_id FROM view_action UNION ALL SELECT id, module_id FROM manage_action) a
WHERE r.role_name IN ('Admin','Application Admin')
ON CONFLICT (role_id, module_id, action_id) DO UPDATE SET is_granted = true;

-- Read-only view for LEGAL_ADMIN
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, ma.module_id, ma.id, true
FROM roles r
JOIN app_modules m ON m.name = 'org_enterprise_health'
JOIN module_actions ma ON ma.module_id = m.id AND ma.action_name = 'view'
WHERE r.role_name = 'LEGAL_ADMIN'
ON CONFLICT (role_id, module_id, action_id) DO UPDATE SET is_granted = true;
