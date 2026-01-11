-- Grant Admin role permissions for Data Access Control modules
DO $$
DECLARE
  admin_role_id UUID;
BEGIN
  -- Get Admin role ID
  SELECT id INTO admin_role_id FROM roles WHERE role_name = 'Admin';
  
  IF admin_role_id IS NULL THEN
    RAISE NOTICE 'Admin role not found';
    RETURN;
  END IF;

  -- Insert permissions for all Data Access Control module actions
  INSERT INTO role_permissions (role_id, module_id, action_id, is_granted)
  SELECT 
    admin_role_id,
    m.id,
    ma.id,
    true
  FROM app_modules m
  INNER JOIN module_actions ma ON ma.module_id = m.id
  WHERE m.name IN ('data_access_control', 'data_scope_rules', 'field_security', 'role_data_policies', 'user_data_overrides', 'policy_test_console')
  ON CONFLICT (role_id, module_id, action_id) DO UPDATE SET is_granted = true;
  
  RAISE NOTICE 'Admin permissions granted for Data Access Control modules';
END $$;