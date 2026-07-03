INSERT INTO public.app_modules
  (id, name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu)
VALUES
  ('1e9a1000-0000-0000-0000-0000000007c1'::uuid,
   'lg_legal_recovery_dashboard',
   'Legal Recovery Dashboard',
   'Portfolio-wide post-judgment recovery KPIs, breakdowns, and health signals.',
   'LineChart',
   '/legal/lg/legal-recovery-dashboard',
   '1e9a1000-0000-0000-0000-000000000001'::uuid,
   6, true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
SELECT m.id, 'view', 'View', true
FROM public.app_modules m
WHERE m.id = '1e9a1000-0000-0000-0000-0000000007c1'::uuid
  AND NOT EXISTS (SELECT 1 FROM public.module_actions a WHERE a.module_id = m.id AND a.action_name = 'view');

INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT 'bdec06a6-cfbd-4c4e-a2be-11d6b638b948'::uuid, a.module_id, a.id, true
FROM public.module_actions a
WHERE a.module_id = '1e9a1000-0000-0000-0000-0000000007c1'::uuid
  AND a.action_name = 'view'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = 'bdec06a6-cfbd-4c4e-a2be-11d6b638b948'::uuid
      AND rp.module_id = a.module_id AND rp.action_id = a.id
  );