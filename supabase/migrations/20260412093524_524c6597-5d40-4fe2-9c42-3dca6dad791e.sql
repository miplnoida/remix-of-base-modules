
-- Create 'view' action for both new modules
INSERT INTO public.module_actions (id, module_id, action_name, display_name, description, is_enabled)
VALUES
  ('ca000000-aaaa-0000-0000-000000000095', 'ca000000-0000-0000-0000-000000000095', 'view', 'View', 'View Tools section', true),
  ('ca000000-aaaa-0000-0000-000000000096', 'ca000000-0000-0000-0000-000000000096', 'view', 'View', 'View Rule Simulator', true)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions to same roles that have Rule Engine access
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
VALUES
  ('2099a434-7974-459c-9b8c-6131d05cb490', 'ca000000-0000-0000-0000-000000000095', 'ca000000-aaaa-0000-0000-000000000095', true),
  ('2099a434-7974-459c-9b8c-6131d05cb490', 'ca000000-0000-0000-0000-000000000096', 'ca000000-aaaa-0000-0000-000000000096', true),
  ('bdec06a6-cfbd-4c4e-a2be-11d6b638b948', 'ca000000-0000-0000-0000-000000000095', 'ca000000-aaaa-0000-0000-000000000095', true),
  ('bdec06a6-cfbd-4c4e-a2be-11d6b638b948', 'ca000000-0000-0000-0000-000000000096', 'ca000000-aaaa-0000-0000-000000000096', true)
ON CONFLICT DO NOTHING;
