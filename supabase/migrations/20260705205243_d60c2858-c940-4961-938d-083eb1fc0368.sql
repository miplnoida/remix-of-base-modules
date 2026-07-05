INSERT INTO public.app_modules (
  id, name, display_name, short_name, description, icon, route,
  parent_id, sort_order, is_enabled, show_in_menu, rollout_state
) VALUES (
  '2c2c0000-0000-4000-8000-000000000210',
  'enterprise_configuration_centre',
  'Configuration Centre',
  'Config Centre',
  'Enterprise setup & readiness centre — Shared Domains, Enterprise Implementation and Product prerequisites.',
  'PackageCheck',
  '/admin/configuration-centre',
  NULL,
  5,
  true,
  true,
  'public'
)
ON CONFLICT (id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    description  = EXCLUDED.description,
    icon         = EXCLUDED.icon,
    route        = EXCLUDED.route,
    is_enabled   = EXCLUDED.is_enabled,
    show_in_menu = EXCLUDED.show_in_menu;

UPDATE public.app_modules
SET parent_id = (
  SELECT parent_id FROM public.app_modules
  WHERE id = '2c2c0000-0000-4000-8000-000000000200'
)
WHERE id = '2c2c0000-0000-4000-8000-000000000210'
  AND EXISTS (
    SELECT 1 FROM public.app_modules
    WHERE id = '2c2c0000-0000-4000-8000-000000000200'
  );