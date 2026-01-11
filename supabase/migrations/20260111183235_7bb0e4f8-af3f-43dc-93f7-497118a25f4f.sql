-- Insert module actions for all Data Access Control modules
INSERT INTO module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, 'view', 'View', 'View data access settings', true
FROM app_modules m WHERE m.name IN ('data_access_control', 'data_scope_rules', 'field_security', 'role_data_policies', 'user_data_overrides', 'policy_test_console')
ON CONFLICT (module_id, action_name) DO NOTHING;

INSERT INTO module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, 'create', 'Create', 'Create new rules', true
FROM app_modules m WHERE m.name IN ('data_scope_rules', 'field_security', 'user_data_overrides')
ON CONFLICT (module_id, action_name) DO NOTHING;

INSERT INTO module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, 'edit', 'Edit', 'Edit existing rules', true
FROM app_modules m WHERE m.name IN ('data_scope_rules', 'field_security', 'role_data_policies', 'user_data_overrides')
ON CONFLICT (module_id, action_name) DO NOTHING;

INSERT INTO module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, 'delete', 'Delete', 'Delete rules', true
FROM app_modules m WHERE m.name IN ('data_scope_rules', 'field_security', 'user_data_overrides')
ON CONFLICT (module_id, action_name) DO NOTHING;

INSERT INTO module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, 'test', 'Test', 'Test policies', true
FROM app_modules m WHERE m.name = 'policy_test_console'
ON CONFLICT (module_id, action_name) DO NOTHING;