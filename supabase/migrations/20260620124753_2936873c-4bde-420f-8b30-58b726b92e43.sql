
INSERT INTO public.app_modules (id, name, display_name, icon, route, parent_id, sort_order, description, is_enabled, show_in_menu, routes_enabled, actions_enabled, rollout_state, internal_only)
VALUES
  ('1e9a1000-0000-0000-0000-000000000121', 'lg_admin_fee_config',    'Fee Configuration',     'dollar-sign', '/legal/admin/fees',  '1e9a1000-0000-0000-0000-000000000001', 121, 'Legal fee rules, bundles, waivers',           true, true, true, true, 'public', false),
  ('1e9a1000-0000-0000-0000-000000000122', 'lg_admin_policy_config', 'Workflow & Role Policy','settings',    '/legal/admin/policy','1e9a1000-0000-0000-0000-000000000001', 122, 'Department profile, role mapping, approvals', true, true, true, true, 'public', false)
ON CONFLICT (id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    route = EXCLUDED.route,
    parent_id = EXCLUDED.parent_id,
    sort_order = EXCLUDED.sort_order,
    description = EXCLUDED.description,
    is_enabled = true,
    show_in_menu = true,
    routes_enabled = true,
    actions_enabled = true;

INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
SELECT m.id, 'view', 'View', true
FROM public.app_modules m
WHERE m.id IN ('1e9a1000-0000-0000-0000-000000000121','1e9a1000-0000-0000-0000-000000000122')
  AND NOT EXISTS (
    SELECT 1 FROM public.module_actions ma WHERE ma.module_id = m.id AND ma.action_name = 'view'
  );

INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT rp.role_id, new_ma.module_id, new_ma.id, true
FROM public.role_permissions rp
JOIN public.module_actions src_ma
  ON src_ma.id = rp.action_id
 AND src_ma.module_id = '1e9a1000-0000-0000-0000-000000000120'
 AND src_ma.action_name = 'view'
CROSS JOIN LATERAL (
  SELECT id, module_id FROM public.module_actions
  WHERE action_name = 'view'
    AND module_id IN ('1e9a1000-0000-0000-0000-000000000121','1e9a1000-0000-0000-0000-000000000122')
) new_ma
WHERE rp.module_id = '1e9a1000-0000-0000-0000-000000000120'
  AND rp.is_granted = true
ON CONFLICT DO NOTHING;
