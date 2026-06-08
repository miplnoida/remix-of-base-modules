INSERT INTO public.app_modules (name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu, rollout_state)
VALUES (
  'bn_rule_catalogue',
  'Rule Catalogue',
  'Library · Reusable eligibility rules shared across products. Configure once, map per product.',
  'ListChecks',
  '/bn/config/rule-catalogue',
  '92c8c16d-91c7-4868-bbce-04254af6fc97',
  25,
  true,
  true,
  'public'
)
ON CONFLICT (name) DO UPDATE
SET display_name = EXCLUDED.display_name,
    route = EXCLUDED.route,
    parent_id = EXCLUDED.parent_id,
    sort_order = EXCLUDED.sort_order,
    is_enabled = true,
    show_in_menu = true,
    rollout_state = 'public',
    icon = EXCLUDED.icon,
    description = EXCLUDED.description;