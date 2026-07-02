INSERT INTO public.app_modules (name, display_name, description, icon, route, parent_id, sort_order, show_in_menu, is_enabled)
VALUES (
  'lg_hearing_workbench',
  'Hearing Workbench',
  'Enterprise court operations workbench (EPIC-05).',
  'Gavel',
  '/legal/lg/hearing-workbench',
  (SELECT id FROM public.app_modules WHERE name = 'lg_sec_hearings'),
  5,
  true,
  true
)
ON CONFLICT (name) DO UPDATE
SET route = EXCLUDED.route,
    display_name = EXCLUDED.display_name,
    parent_id = EXCLUDED.parent_id,
    sort_order = EXCLUDED.sort_order,
    show_in_menu = true,
    is_enabled = true,
    updated_at = now();