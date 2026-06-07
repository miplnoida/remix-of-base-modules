
-- Register Cheque Stock under BN Payment Preparation
INSERT INTO public.app_modules (name, display_name, description, route, parent_id, sort_order, show_in_menu, is_enabled)
VALUES (
  'bn_cheque_stock',
  'Cheque Stock',
  'Manage cheque book ranges and stock for BN payments',
  '/bn/cheque-stock',
  'bfaed564-14ce-47a1-816b-8dd5fb9fa539',
  60,
  true,
  true
)
ON CONFLICT (name) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      route        = EXCLUDED.route,
      parent_id    = EXCLUDED.parent_id,
      sort_order   = EXCLUDED.sort_order,
      show_in_menu = true,
      is_enabled   = true;

-- Standard CRUD actions for Cheque Stock (auto-grants Admin via trigger)
WITH m AS (SELECT id FROM public.app_modules WHERE name = 'bn_cheque_stock')
INSERT INTO public.module_actions (module_id, action_name, display_name)
SELECT m.id, a.action_name, a.display_name
FROM m, (VALUES
  ('view',   'View'),
  ('create', 'Create'),
  ('edit',   'Edit'),
  ('delete', 'Delete')
) AS a(action_name, display_name)
ON CONFLICT (module_id, action_name) DO NOTHING;

-- EFT Format editor lives inside Country Payment Config (already registered).
-- Ensure it has standard actions so Admin gets permission via trigger.
WITH m AS (SELECT id FROM public.app_modules WHERE name = 'bn_cp_payment')
INSERT INTO public.module_actions (module_id, action_name, display_name)
SELECT m.id, a.action_name, a.display_name
FROM m, (VALUES
  ('view',   'View'),
  ('create', 'Create'),
  ('edit',   'Edit'),
  ('delete', 'Delete')
) AS a(action_name, display_name)
ON CONFLICT (module_id, action_name) DO NOTHING;
