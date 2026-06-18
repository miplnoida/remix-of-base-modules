INSERT INTO public.app_modules (name, display_name, description, icon, route, parent_id, sort_order, show_in_menu, is_enabled)
VALUES (
  'bn_cp_country_master',
  'Country Master',
  'CRUD for countries (bn_country) with pack-completeness status and default-pack seeding.',
  'map-pin',
  '/bn/config/country-master',
  'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  5,
  true,
  true
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  route = EXCLUDED.route,
  parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  show_in_menu = true,
  is_enabled = true;