
INSERT INTO public.app_modules (id, name, display_name, route, parent_id, sort_order, is_enabled, show_in_menu, icon)
VALUES
  ('ca000000-0000-0000-0000-000000000095', 'compliance_tools', 'Tools', NULL, 'ca000000-0000-0000-0000-000000000001', 75, true, true, 'Wrench'),
  ('ca000000-0000-0000-0000-000000000096', 'ce_rule_simulator', 'Rule Simulator', '/compliance/tools/rule-simulator', 'ca000000-0000-0000-0000-000000000095', 1, true, true, 'FlaskConical')
ON CONFLICT (id) DO NOTHING;
