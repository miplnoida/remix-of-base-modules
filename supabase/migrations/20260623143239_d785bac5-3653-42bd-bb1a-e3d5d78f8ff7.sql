INSERT INTO public.app_modules (id, name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu)
VALUES (
  '1e9a1000-0000-0000-0000-000000000260',
  'lg_admin_courts',
  'Courts',
  'Configure courts, divisions, venues and officers (Judges/Magistrates)',
  'Gavel',
  '/legal/admin/courts',
  '1e9a1000-0000-0000-0000-000000000200',
  4,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  route = EXCLUDED.route,
  parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  show_in_menu = true,
  is_enabled = true;

INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
SELECT '1e9a1000-0000-0000-0000-000000000260', a.action_name, a.display_name, true
FROM (VALUES ('view','View'), ('create','Create'), ('edit','Edit'), ('delete','Delete')) AS a(action_name, display_name)
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT 'bdec06a6-cfbd-4c4e-a2be-11d6b638b948', ma.module_id, ma.id, true
FROM public.module_actions ma
WHERE ma.module_id = '1e9a1000-0000-0000-0000-000000000260'
ON CONFLICT DO NOTHING;