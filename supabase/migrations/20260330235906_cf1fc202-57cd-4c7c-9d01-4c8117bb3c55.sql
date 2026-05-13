
-- Grant permissions to Admin role (created_by is uuid, omit it)
INSERT INTO public.role_permissions (role_id, action_id, module_id, is_granted)
SELECT r.id, ma.id, m.id, true
FROM roles r
JOIN app_modules m ON m.name = 'audit_risk_settings'
JOIN module_actions ma ON ma.module_id = m.id
WHERE r.role_name = 'Admin'
ON CONFLICT DO NOTHING;

-- Grant view-only to Audit Manager and Auditor
INSERT INTO public.role_permissions (role_id, action_id, module_id, is_granted)
SELECT r.id, ma.id, m.id, true
FROM roles r
JOIN app_modules m ON m.name = 'audit_risk_settings'
JOIN module_actions ma ON ma.module_id = m.id AND ma.action_name = 'view'
WHERE r.role_name IN ('Audit Manager', 'Auditor')
ON CONFLICT DO NOTHING;
