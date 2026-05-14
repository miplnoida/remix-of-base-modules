
-- 1. Re-enable Settings parent
UPDATE public.app_modules
SET display_name = 'Settings',
    icon = 'Settings',
    is_enabled = true,
    show_in_menu = true,
    sort_order = 55
WHERE id = 'c3010000-0000-0000-0000-000000000030';

-- 2. Re-parent Settings & Configuration under Settings
UPDATE public.app_modules
SET parent_id = 'c3010000-0000-0000-0000-000000000030',
    sort_order = 15,
    is_enabled = true,
    show_in_menu = true
WHERE id = 'aa1a72a6-0000-0000-0000-000000000025';

-- 3. Enable Self Employed + Cybersource children
UPDATE public.app_modules
SET is_enabled = true,
    show_in_menu = true
WHERE id IN ('c3010000-0000-0000-0000-000000000031','c3010000-0000-0000-0000-000000000032');

-- 4. Insert Email Templates under Settings
INSERT INTO public.app_modules (id, name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu)
VALUES (
  'c3010000-0000-0000-0000-000000000033',
  'c3_email_templates',
  'Email Templates',
  'Manage C3 Wizard email templates with master-mirror sync',
  'Mail',
  '/c3-management/email-templates',
  'c3010000-0000-0000-0000-000000000030',
  5,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  icon = EXCLUDED.icon,
  route = EXCLUDED.route,
  parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  is_enabled = true,
  show_in_menu = true;

-- 5. Mirror role grants from C3 Management parent to Settings + all children
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT rp.role_id, m.module_id, rp.action_id, true
FROM public.role_permissions rp
CROSS JOIN (VALUES
  ('c3010000-0000-0000-0000-000000000030'::uuid),
  ('c3010000-0000-0000-0000-000000000031'::uuid),
  ('c3010000-0000-0000-0000-000000000032'::uuid),
  ('c3010000-0000-0000-0000-000000000033'::uuid),
  ('aa1a72a6-0000-0000-0000-000000000025'::uuid)
) AS m(module_id)
WHERE rp.module_id = 'aa1a72a6-308c-4689-9ca1-9d732c0d6198'
  AND rp.is_granted = true
ON CONFLICT DO NOTHING;
