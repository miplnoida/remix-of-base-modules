-- Fix the auto_grant_admin_permission function to use role_id instead of role
CREATE OR REPLACE FUNCTION public.auto_grant_admin_permission()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  admin_role_id UUID;
BEGIN
  -- Get the Admin role ID
  SELECT id INTO admin_role_id FROM roles WHERE role_name = 'Admin';
  
  IF admin_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, module_id, action_id, is_granted)
    VALUES (admin_role_id, NEW.module_id, NEW.id, true)
    ON CONFLICT (role_id, module_id, action_id) DO UPDATE SET is_granted = true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Now insert the module actions
INSERT INTO public.module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, a.action_name, a.display_name, a.description, true
FROM app_modules m
CROSS JOIN (
  VALUES 
    ('view', 'View', 'View data access settings'),
    ('create', 'Create', 'Create new rules'),
    ('edit', 'Edit', 'Edit existing rules'),
    ('delete', 'Delete', 'Delete rules'),
    ('test', 'Test', 'Test policies')
) AS a(action_name, display_name, description)
WHERE m.name IN ('data_scope_rules', 'field_security', 'role_data_policies', 'user_data_overrides', 'policy_test_console')
ON CONFLICT (module_id, action_name) DO NOTHING;

-- Grant Admin role full access to all Data Access Control modules
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT 
  r.id as role_id,
  m.id as module_id,
  ma.id as action_id,
  true as is_granted
FROM roles r
CROSS JOIN app_modules m
CROSS JOIN module_actions ma
WHERE r.role_name = 'Admin'
  AND m.name IN ('data_access_control', 'data_scope_rules', 'field_security', 'role_data_policies', 'user_data_overrides', 'policy_test_console')
  AND ma.module_id = m.id
ON CONFLICT (role_id, module_id, action_id) DO UPDATE SET is_granted = true;