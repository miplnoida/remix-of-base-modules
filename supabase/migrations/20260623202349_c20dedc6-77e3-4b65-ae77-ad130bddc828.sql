
-- Add two entries under Employers Management (91a509c7-c24a-4f4f-8b48-df86e13a1739)
INSERT INTO public.app_modules (id, name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu, rollout_state, routes_enabled, actions_enabled)
VALUES
  ('91a509c7-c24a-4f4f-8b48-df86e1360001', 'em_employer_360', 'Employer 360°', 'Unified view of an employer — financials, cases, ledger, communications', 'Eye', '/compliance/field/employer-360', '91a509c7-c24a-4f4f-8b48-df86e13a1739', 30, true, true, 'public', true, true),
  ('91a509c7-c24a-4f4f-8b48-df86e1360002', 'em_employer_ledger', 'Employer Ledger', 'Open the central employer ledger — pick employer then click Ledger', 'BookOpen', '/compliance/field/employer-360', '91a509c7-c24a-4f4f-8b48-df86e13a1739', 40, true, true, 'public', true, true)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  route = EXCLUDED.route,
  parent_id = EXCLUDED.parent_id,
  is_enabled = true, show_in_menu = true, updated_at = now();

INSERT INTO public.module_actions (id, module_id, action_name, display_name, description, is_enabled)
VALUES
  (gen_random_uuid(), '91a509c7-c24a-4f4f-8b48-df86e1360001', 'view', 'View', 'View this module', true),
  (gen_random_uuid(), '91a509c7-c24a-4f4f-8b48-df86e1360002', 'view', 'View', 'View this module', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (id, role_id, module_id, action_id, is_granted)
SELECT gen_random_uuid(), r.id, ma.module_id, ma.id, true
FROM public.module_actions ma
CROSS JOIN public.roles r
WHERE ma.module_id IN ('91a509c7-c24a-4f4f-8b48-df86e1360001','91a509c7-c24a-4f4f-8b48-df86e1360002')
  AND ma.action_name = 'view'
  AND r.role_name IN ('Admin','FinanceOfficer','Clerk','Manager','Supervisor')
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.module_id = ma.module_id AND rp.action_id = ma.id
  );
