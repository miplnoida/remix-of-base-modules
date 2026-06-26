
-- 1) New modules under Organization Management
WITH parent AS (
  SELECT id FROM public.app_modules WHERE name = 'organization_management'
), inserted AS (
  INSERT INTO public.app_modules (name, display_name, parent_id, route, icon, sort_order, is_enabled, show_in_menu, description)
  SELECT v.name, v.display_name, (SELECT id FROM parent), v.route, v.icon, v.sort_order, true, true, v.description
  FROM (VALUES
    ('org_media_library',        'Media Library',           '/admin/organization/media-library',         'FileText', 35, 'Centralized library for logos, banners, and other branded assets'),
    ('org_comm_letterheads',     'Letterheads',             '/admin/communication/letterhead',           'FileText', 31, 'Manage organization letterheads'),
    ('org_comm_email_signatures','Email Signatures',        '/admin/communication/signature',            'Mail',     32, 'Manage email signatures'),
    ('org_comm_disclaimers',     'Disclaimers',             '/admin/communication/disclaimer',           'Shield',   33, 'Manage legal and compliance disclaimers'),
    ('org_comm_print_footers',   'Print Footers',           '/admin/communication/footer',               'FileText', 34, 'Manage print footers for PDFs and receipts')
  ) AS v(name, display_name, route, icon, sort_order, description)
  ON CONFLICT (name) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        parent_id    = EXCLUDED.parent_id,
        route        = EXCLUDED.route,
        icon         = EXCLUDED.icon,
        sort_order   = EXCLUDED.sort_order,
        is_enabled   = true,
        show_in_menu = true,
        description  = EXCLUDED.description
  RETURNING id, name
)
SELECT * FROM inserted;

-- 2) Standard view/manage actions for each new module
INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
SELECT am.id, a.action_name, a.display_name, true
FROM public.app_modules am
CROSS JOIN (VALUES
  ('view',   'View'),
  ('manage', 'Manage')
) AS a(action_name, display_name)
WHERE am.name IN ('org_media_library','org_comm_letterheads','org_comm_email_signatures','org_comm_disclaimers','org_comm_print_footers')
ON CONFLICT DO NOTHING;

-- 3) Grant the Admin role view+manage on each new module
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, ma.module_id, ma.id, true
FROM public.roles r
JOIN public.module_actions ma ON true
JOIN public.app_modules am ON am.id = ma.module_id
WHERE r.role_name IN ('Admin','Application Admin')
  AND am.name IN ('org_media_library','org_comm_letterheads','org_comm_email_signatures','org_comm_disclaimers','org_comm_print_footers')
ON CONFLICT DO NOTHING;
