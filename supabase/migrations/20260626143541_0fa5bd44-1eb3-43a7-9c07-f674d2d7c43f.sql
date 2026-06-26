
INSERT INTO role_permissions (role_id, module_id, action_id)
SELECT r.id, m.id, a.id
FROM roles r
CROSS JOIN module_actions a
JOIN app_modules m ON m.id = a.module_id
WHERE r.role_name IN ('Admin','Application Admin')
  AND m.name IN ('organization_management','org_profile','org_locations','org_comm_assets','dept_profiles','org_usage_validation')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, module_id, action_id)
SELECT r.id, m.id, a.id
FROM roles r
CROSS JOIN module_actions a
JOIN app_modules m ON m.id = a.module_id
WHERE r.role_name = 'LEGAL_ADMIN'
  AND a.action_name = 'view'
  AND m.name IN ('organization_management','org_profile','org_locations','org_comm_assets','dept_profiles')
ON CONFLICT DO NOTHING;
