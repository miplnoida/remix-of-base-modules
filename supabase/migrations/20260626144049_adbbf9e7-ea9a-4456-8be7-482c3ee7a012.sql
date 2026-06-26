
INSERT INTO module_actions (module_id, action_name, display_name, is_enabled)
SELECT id, 'view', 'View', true FROM app_modules WHERE name IN ('organization_management','org_usage_validation')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, m.id, a.id, true
FROM roles r
CROSS JOIN module_actions a
JOIN app_modules m ON m.id = a.module_id
WHERE r.role_name IN ('Admin','Application Admin')
  AND m.name IN ('organization_management','org_usage_validation')
ON CONFLICT DO NOTHING;

-- ensure is_granted=true on the previously inserted rows
UPDATE role_permissions rp
SET is_granted = true
FROM module_actions a, app_modules m, roles r
WHERE rp.action_id = a.id AND a.module_id = m.id AND rp.role_id = r.id
  AND m.name IN ('organization_management','org_profile','org_locations','org_comm_assets','dept_profiles','org_usage_validation')
  AND (rp.is_granted IS NULL OR rp.is_granted = false);
