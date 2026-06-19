
-- Root: Legal Enforcement module
INSERT INTO public.app_modules (id, name, display_name, icon, route, parent_id, sort_order, description, is_enabled, show_in_menu, routes_enabled, actions_enabled, rollout_state)
VALUES
  ('1e9a1000-0000-0000-0000-000000000001', 'legal_enforcement', 'Legal Enforcement', 'scale', NULL, NULL, 705, 'Legal cases, hearings, notices, orders and enforcement', true, true, true, true, 'public'),
  ('1e9a1000-0000-0000-0000-000000000010', 'lg_dashboard', 'Legal Dashboard', 'layout-dashboard', '/legal/lg/dashboard', '1e9a1000-0000-0000-0000-000000000001', 10, 'Overview of legal cases, hearings, tasks', true, true, true, true, 'public'),
  ('1e9a1000-0000-0000-0000-000000000020', 'lg_case_tracking', 'Case Tracking', 'search', '/legal/cases', '1e9a1000-0000-0000-0000-000000000001', 20, 'Browse and manage legal cases', true, true, true, true, 'public'),
  ('1e9a1000-0000-0000-0000-000000000030', 'lg_case_intake', 'Case Intake', 'file-plus', '/legal/cases/intake', '1e9a1000-0000-0000-0000-000000000001', 30, 'Intake new legal cases', true, true, true, true, 'public'),
  ('1e9a1000-0000-0000-0000-000000000040', 'lg_hearing_calendar', 'Hearing Calendar', 'calendar', '/legal/lg/hearings', '1e9a1000-0000-0000-0000-000000000001', 40, 'Upcoming hearings calendar', true, true, true, true, 'public'),
  ('1e9a1000-0000-0000-0000-000000000050', 'lg_notices', 'Legal Notices', 'file-text', '/legal/notices', '1e9a1000-0000-0000-0000-000000000001', 50, 'Generate and manage legal notices', true, true, true, true, 'public'),
  ('1e9a1000-0000-0000-0000-000000000060', 'lg_documents', 'Legal Documents', 'folder-tree', '/legal/documents', '1e9a1000-0000-0000-0000-000000000001', 60, 'Legal document center', true, true, true, true, 'public'),
  ('1e9a1000-0000-0000-0000-000000000070', 'lg_court_orders', 'Court Orders', 'gavel', '/legal/court-orders', '1e9a1000-0000-0000-0000-000000000001', 70, 'Court orders and judgments', true, true, true, true, 'public'),
  ('1e9a1000-0000-0000-0000-000000000080', 'lg_enforcement_actions', 'Enforcement Actions', 'shield-alert', '/legal/enforcement', '1e9a1000-0000-0000-0000-000000000001', 80, 'Track enforcement actions', true, true, true, true, 'public'),
  ('1e9a1000-0000-0000-0000-000000000090', 'lg_payment_plans', 'Payment Plans', 'credit-card', '/legal/payment-plans', '1e9a1000-0000-0000-0000-000000000001', 90, 'Monitor linked payment arrangements', true, true, true, true, 'public'),
  ('1e9a1000-0000-0000-0000-000000000100', 'lg_workbench', 'Legal Workbench', 'briefcase', '/legal/workbench', '1e9a1000-0000-0000-0000-000000000001', 100, 'Officer workbench', true, true, true, true, 'public'),
  ('1e9a1000-0000-0000-0000-000000000110', 'lg_reports', 'Legal Reports', 'bar-chart-3', '/legal/reports', '1e9a1000-0000-0000-0000-000000000001', 110, 'Legal reports and analytics', true, true, true, true, 'public'),
  ('1e9a1000-0000-0000-0000-000000000120', 'lg_admin', 'Legal Admin', 'settings', '/legal/admin', '1e9a1000-0000-0000-0000-000000000001', 120, 'Codes, templates and configuration', true, true, true, true, 'public')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  icon = EXCLUDED.icon,
  route = EXCLUDED.route,
  parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  is_enabled = true,
  show_in_menu = true,
  routes_enabled = true;

-- Create 'view' action for each new module
INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
SELECT m.id, 'view', 'View', true
FROM public.app_modules m
WHERE m.id IN (
  '1e9a1000-0000-0000-0000-000000000001',
  '1e9a1000-0000-0000-0000-000000000010',
  '1e9a1000-0000-0000-0000-000000000020',
  '1e9a1000-0000-0000-0000-000000000030',
  '1e9a1000-0000-0000-0000-000000000040',
  '1e9a1000-0000-0000-0000-000000000050',
  '1e9a1000-0000-0000-0000-000000000060',
  '1e9a1000-0000-0000-0000-000000000070',
  '1e9a1000-0000-0000-0000-000000000080',
  '1e9a1000-0000-0000-0000-000000000090',
  '1e9a1000-0000-0000-0000-000000000100',
  '1e9a1000-0000-0000-0000-000000000110',
  '1e9a1000-0000-0000-0000-000000000120'
)
AND NOT EXISTS (
  SELECT 1 FROM public.module_actions ma
  WHERE ma.module_id = m.id AND ma.action_name = 'view'
);

-- Grant 'view' to the Admin role
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, ma.module_id, ma.id, true
FROM public.roles r
CROSS JOIN public.module_actions ma
WHERE r.role_name = 'Admin'
  AND ma.action_name = 'view'
  AND ma.module_id IN (
    '1e9a1000-0000-0000-0000-000000000001',
    '1e9a1000-0000-0000-0000-000000000010',
    '1e9a1000-0000-0000-0000-000000000020',
    '1e9a1000-0000-0000-0000-000000000030',
    '1e9a1000-0000-0000-0000-000000000040',
    '1e9a1000-0000-0000-0000-000000000050',
    '1e9a1000-0000-0000-0000-000000000060',
    '1e9a1000-0000-0000-0000-000000000070',
    '1e9a1000-0000-0000-0000-000000000080',
    '1e9a1000-0000-0000-0000-000000000090',
    '1e9a1000-0000-0000-0000-000000000100',
    '1e9a1000-0000-0000-0000-000000000110',
    '1e9a1000-0000-0000-0000-000000000120'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.module_id = ma.module_id AND rp.action_id = ma.id
  );
