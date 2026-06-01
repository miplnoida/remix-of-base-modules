
-- 1) Repurpose existing hidden ce_waivers_overrides row to surface Waiver Requests
UPDATE public.app_modules
SET display_name = 'Waiver Requests',
    name = 'ce_waiver_requests',
    route = '/compliance/enforcement/waivers',
    icon = 'shield-check',
    show_in_menu = true,
    is_enabled = true,
    routes_enabled = true,
    sort_order = 80,
    updated_at = now()
WHERE id = 'ca000000-0000-0000-0000-000000000076';

-- 2) Insert Legal Referral under Legal Escalations
INSERT INTO public.app_modules
  (id, name, display_name, description, icon, route, parent_id, sort_order,
   is_enabled, show_in_menu, routes_enabled, actions_enabled)
VALUES
  ('cb000001-0000-0000-0000-000000000706',
   'ce_legal_referral',
   'Legal Referral',
   'Refer cases to legal handoff workflow',
   'send',
   '/compliance/enforcement/legal-referral',
   'ca000000-0000-0000-0000-000000000070',
   8,
   true, true, true, true)
ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      route = EXCLUDED.route,
      parent_id = EXCLUDED.parent_id,
      show_in_menu = true,
      is_enabled = true,
      routes_enabled = true,
      sort_order = EXCLUDED.sort_order,
      updated_at = now();

-- 3) Add a view action for Legal Referral so non-admin users with the
--    relevant role can also see it (admins already bypass this check).
INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
VALUES ('cb000001-0000-0000-0000-000000000706', 'view', 'View', true)
ON CONFLICT DO NOTHING;
