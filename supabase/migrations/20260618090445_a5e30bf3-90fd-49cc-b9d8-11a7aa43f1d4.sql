INSERT INTO public.app_modules (id, name, display_name, parent_id, route, sort_order, icon, is_enabled, show_in_menu, description)
VALUES (
  gen_random_uuid(),
  'bn_reference_data',
  'Reference Data',
  '92c8c16d-91c7-4868-bbce-04254af6fc97',
  '/bn/config/reference-data',
  140,
  'Settings',
  true,
  true,
  'Governance · Manage dropdown values used across Benefits configuration (table types, statuses, methods).'
)
ON CONFLICT DO NOTHING;