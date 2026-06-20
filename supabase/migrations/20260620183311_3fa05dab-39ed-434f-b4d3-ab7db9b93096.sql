
-- 1. Insert Legal Admin sub-modules (siblings of /legal/admin/fees, /legal/admin/policy)
INSERT INTO public.app_modules (id, name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu, routes_enabled, rollout_state)
VALUES
  ('1e9a1000-0000-0000-0000-000000000123','lg_admin_codesets','Code Sets','Dropdown values and reference data','code','/legal/admin/codesets','1e9a1000-0000-0000-0000-000000000001',123,true,true,true,'public'),
  ('1e9a1000-0000-0000-0000-000000000124','lg_admin_templates','Templates','Notices, letters and PDFs (Core Templates)','file-text','/legal/admin/templates','1e9a1000-0000-0000-0000-000000000001',124,true,true,true,'public'),
  ('1e9a1000-0000-0000-0000-000000000125','lg_admin_legal_refs','Legal References','Acts, regulations and policies (shared)','scale','/legal/admin/legal-references','1e9a1000-0000-0000-0000-000000000001',125,true,true,true,'public'),
  ('1e9a1000-0000-0000-0000-000000000126','lg_admin_complainant','Complainant Settings','Default complainant info','building2','/legal/admin/complainant','1e9a1000-0000-0000-0000-000000000001',126,true,true,true,'public')
ON CONFLICT (id) DO UPDATE SET
  is_enabled=true, show_in_menu=true, routes_enabled=true, rollout_state='public',
  display_name=EXCLUDED.display_name, route=EXCLUDED.route, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- 2. Ensure 'view' module_actions exist for all relevant modules
WITH target_modules AS (
  SELECT id FROM public.app_modules WHERE id IN (
    '095d7477-89cf-4237-a20d-a3656d637b59', -- BN Legal References
    '1e9a1000-0000-0000-0000-000000000123',
    '1e9a1000-0000-0000-0000-000000000124',
    '1e9a1000-0000-0000-0000-000000000125',
    '1e9a1000-0000-0000-0000-000000000126'
  )
)
INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
SELECT tm.id, a.action_name, a.display_name, true
FROM target_modules tm
CROSS JOIN (VALUES
  ('view','View'),
  ('create','Create'),
  ('edit','Edit'),
  ('delete','Delete')
) a(action_name, display_name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.module_actions ma WHERE ma.module_id = tm.id AND ma.action_name = a.action_name
);

-- 3. Grant 'view' to relevant roles for the new Legal Admin sub-modules
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, ma.module_id, ma.id, true
FROM public.module_actions ma
JOIN public.roles r ON r.role_name IN ('Admin','LEGAL_ADMIN','LEGAL_MANAGER','LEGAL_OFFICER','SENIOR_LEGAL_OFFICER','LEGAL_READ_ONLY','LegalOfficer','ComplianceAdmin','ComplianceLegalOfficer')
WHERE ma.module_id IN (
  '1e9a1000-0000-0000-0000-000000000123',
  '1e9a1000-0000-0000-0000-000000000124',
  '1e9a1000-0000-0000-0000-000000000125',
  '1e9a1000-0000-0000-0000-000000000126'
)
AND ma.action_name = 'view'
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.role_id = r.id AND rp.module_id = ma.module_id AND rp.action_id = ma.id
);

-- 4. Grant 'view' on BN Legal References to Admin + BN config/legal roles
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, ma.module_id, ma.id, true
FROM public.module_actions ma
JOIN public.roles r ON r.role_name IN (
  'Admin','BN_CONFIG_ADMIN','BN_MANAGER','BN_DIRECTOR','BN_SUPERVISOR',
  'BN_RULE_AUTHOR','BN_RULE_LEGAL_APPROVER','BN_RULE_TECHNICAL_REVIEWER',
  'BN_PRODUCT_MANAGER','BN_PRODUCT_APPROVER',
  'LEGAL_ADMIN','LEGAL_MANAGER','LEGAL_OFFICER','SENIOR_LEGAL_OFFICER','LEGAL_READ_ONLY'
)
WHERE ma.module_id = '095d7477-89cf-4237-a20d-a3656d637b59'
AND ma.action_name = 'view'
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.role_id = r.id AND rp.module_id = ma.module_id AND rp.action_id = ma.id
);
