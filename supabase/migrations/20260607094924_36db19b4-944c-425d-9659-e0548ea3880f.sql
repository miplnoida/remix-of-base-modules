
-- 1) Register the module under bn_configuration
INSERT INTO public.app_modules (id, parent_id, name, display_name, description, icon, route, sort_order, is_enabled, show_in_menu, routes_enabled, actions_enabled)
VALUES (
  gen_random_uuid(),
  '92c8c16d-91c7-4868-bbce-04254af6fc97',
  'bn_communication_templates',
  'Communication Templates',
  'Manage benefit notification templates (letters, emails, SMS, in-app).',
  'Mail',
  '/bn/config/communication-templates',
  130, true, true, true, true
)
ON CONFLICT (name) DO UPDATE
  SET parent_id = EXCLUDED.parent_id,
      display_name = EXCLUDED.display_name,
      route = EXCLUDED.route,
      icon = EXCLUDED.icon,
      is_enabled = true,
      show_in_menu = true;

-- 2) Create standard actions for it
WITH m AS (SELECT id FROM public.app_modules WHERE name='bn_communication_templates')
INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
SELECT m.id, a.action_name, a.display_name, true
FROM m, (VALUES ('view','View'),('create','Create'),('edit','Edit'),('delete','Delete')) AS a(action_name, display_name)
ON CONFLICT DO NOTHING;

-- 3) Grant all actions to Admin role and any role that already has view on benefits_management
WITH m AS (SELECT id FROM public.app_modules WHERE name='bn_communication_templates'),
acts AS (SELECT id FROM public.module_actions WHERE module_id = (SELECT id FROM m)),
target_roles AS (
  SELECT id FROM public.roles WHERE role_name = 'Admin'
  UNION
  SELECT DISTINCT rp.role_id
  FROM public.role_permissions rp
  JOIN public.module_actions ma ON ma.id = rp.action_id
  WHERE rp.module_id = '839cee37-4006-43a4-a53c-6d0cea76a6b0'
    AND ma.action_name = 'view'
    AND rp.is_granted = true
)
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT tr.id, (SELECT id FROM m), a.id, true
FROM target_roles tr CROSS JOIN acts a
ON CONFLICT DO NOTHING;
