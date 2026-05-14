-- Add Role Permission and Role Master modules under Manage Users
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, show_in_menu, description)
VALUES 
  ('c3010000-0000-0000-0000-000000000043', 'c3_role_permission', 'Role Permission', 'Shield', '/c3-management/users/role-permission', 'c3010000-0000-0000-0000-000000000040', 30, true, true, 'Manage role permissions for C3 Wizard users'),
  ('c3010000-0000-0000-0000-000000000044', 'c3_role_master', 'Role Master', 'ShieldCheck', '/c3-management/users/role-master', 'c3010000-0000-0000-0000-000000000040', 40, true, true, 'Manage roles for C3 Wizard users')
ON CONFLICT (id) DO UPDATE SET
  route = EXCLUDED.route,
  display_name = EXCLUDED.display_name,
  is_enabled = EXCLUDED.is_enabled,
  show_in_menu = EXCLUDED.show_in_menu;