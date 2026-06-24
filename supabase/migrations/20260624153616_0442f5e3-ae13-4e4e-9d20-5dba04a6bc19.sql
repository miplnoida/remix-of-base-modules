-- Add menu entries for new Legal Referral wizard launcher screens (both placements)
-- and grant view permission to the Admin role (covers admin@secureserve.gov).

INSERT INTO public.app_modules (id, name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu)
VALUES
  -- Compliance sidebar -> Legal Escalations
  ('cb000001-0000-0000-0000-0000000007a1'::uuid, 'ce_legal_referral_launcher', 'Legal Referral Wizard',
   'Pick a compliance case and forward selected arrears / periods / heads to Legal.',
   'Scale', '/compliance/legal-referral/launcher',
   'ca000000-0000-0000-0000-000000000070'::uuid, 9, true, true),
  -- Benefits sidebar -> Operations
  ('bb000001-0000-0000-0000-0000000007a2'::uuid, 'bn_legal_referral_launcher', 'Legal Referral Wizard',
   'Pick a benefit claim and forward overpayments / disputes to Legal.',
   'Scale', '/bn/legal-referral/launcher',
   'b72990ca-ff29-434c-8655-104621ba3a5e'::uuid, 90, true, true),
  -- Legal module -> Legal Enforcement parent (alongside Case Intake)
  ('1e9a1000-0000-0000-0000-0000000007a3'::uuid, 'lg_legal_referral_compliance', 'Referral from Compliance',
   'Launch the Compliance → Legal referral wizard.',
   'Scale', '/compliance/legal-referral/launcher',
   '1e9a1000-0000-0000-0000-000000000001'::uuid, 31, true, true),
  ('1e9a1000-0000-0000-0000-0000000007a4'::uuid, 'lg_legal_referral_benefits', 'Referral from Benefits',
   'Launch the Benefits → Legal referral wizard.',
   'Scale', '/bn/legal-referral/launcher',
   '1e9a1000-0000-0000-0000-000000000001'::uuid, 32, true, true)
ON CONFLICT (id) DO NOTHING;

-- View action for each module
INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
SELECT m.id, 'view', 'View', true
FROM public.app_modules m
WHERE m.id IN (
  'cb000001-0000-0000-0000-0000000007a1'::uuid,
  'bb000001-0000-0000-0000-0000000007a2'::uuid,
  '1e9a1000-0000-0000-0000-0000000007a3'::uuid,
  '1e9a1000-0000-0000-0000-0000000007a4'::uuid
)
AND NOT EXISTS (
  SELECT 1 FROM public.module_actions a WHERE a.module_id = m.id AND a.action_name = 'view'
);

-- Grant Admin role permission to view each new module
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT 'bdec06a6-cfbd-4c4e-a2be-11d6b638b948'::uuid, a.module_id, a.id, true
FROM public.module_actions a
WHERE a.module_id IN (
  'cb000001-0000-0000-0000-0000000007a1'::uuid,
  'bb000001-0000-0000-0000-0000000007a2'::uuid,
  '1e9a1000-0000-0000-0000-0000000007a3'::uuid,
  '1e9a1000-0000-0000-0000-0000000007a4'::uuid
)
AND a.action_name = 'view'
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.role_id = 'bdec06a6-cfbd-4c4e-a2be-11d6b638b948'::uuid
    AND rp.module_id = a.module_id
    AND rp.action_id = a.id
);