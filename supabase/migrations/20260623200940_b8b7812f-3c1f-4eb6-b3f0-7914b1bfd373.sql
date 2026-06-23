
-- 1. Menu entries under "Integrations & Ledger" (ca000000-...-118)
INSERT INTO public.app_modules (id, name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu, rollout_state, routes_enabled, actions_enabled)
VALUES
  ('ca000000-0000-0000-0000-000000000168', 'ce_ledger_recalc_wizard', 'Ledger Recalculation Wizard', 'Preview and post adjustment entries to the central employer ledger', 'Calculator', '/ledger/recalc', 'ca000000-0000-0000-0000-000000000118', 50, true, true, 'public', true, true),
  ('ca000000-0000-0000-0000-000000000169', 'ce_payment_allocation_rules', 'Payment Allocation Rules', 'Configure SS/LV/PE allocation priority and oldest-period-first rules', 'ListOrdered', '/admin/ledger/allocation-rules', 'ca000000-0000-0000-0000-000000000118', 60, true, true, 'public', true, true)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  route = EXCLUDED.route,
  parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  is_enabled = true,
  show_in_menu = true,
  updated_at = now();

-- 2. View actions
INSERT INTO public.module_actions (id, module_id, action_name, display_name, description, is_enabled)
VALUES
  (gen_random_uuid(), 'ca000000-0000-0000-0000-000000000168', 'view', 'View', 'View this module', true),
  (gen_random_uuid(), 'ca000000-0000-0000-0000-000000000169', 'view', 'View', 'View this module', true)
ON CONFLICT DO NOTHING;

-- 3. Grant view to Admin and FinanceOfficer
INSERT INTO public.role_permissions (id, role_id, module_id, action_id, is_granted)
SELECT gen_random_uuid(), r.id, ma.module_id, ma.id, true
FROM public.module_actions ma
CROSS JOIN public.roles r
WHERE ma.module_id IN ('ca000000-0000-0000-0000-000000000168','ca000000-0000-0000-0000-000000000169')
  AND ma.action_name = 'view'
  AND r.role_name IN ('Admin','FinanceOfficer')
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.module_id = ma.module_id AND rp.action_id = ma.id
  );
