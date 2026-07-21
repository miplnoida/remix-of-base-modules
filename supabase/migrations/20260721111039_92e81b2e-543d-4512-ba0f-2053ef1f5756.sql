
INSERT INTO public.app_modules (id, name, display_name, description, route, parent_id, sort_order, show_in_menu, is_enabled)
VALUES (
  'c0110000-0000-4000-8000-00000000001a',
  'communication_hub_go_live',
  'Go Live',
  'Guided journey: readiness, preview approval, dry-run certification and controlled-live test.',
  '/admin/communication-hub/go-live',
  'c0110000-0000-4000-8000-000000000001',
  15,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description  = EXCLUDED.description,
  route        = EXCLUDED.route,
  sort_order   = EXCLUDED.sort_order,
  show_in_menu = EXCLUDED.show_in_menu,
  is_enabled   = EXCLUDED.is_enabled;
