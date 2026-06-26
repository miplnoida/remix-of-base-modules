
UPDATE public.app_modules
SET show_in_menu = false
WHERE parent_id = (SELECT id FROM public.app_modules WHERE name='organization_management')
  AND name NOT IN ('org_profile','org_locations','dept_profiles','org_media_library','org_usage_validation',
                   'org_letterheads','org_notification_templates','org_portal_branding',
                   'org_document_assets','org_dept_mapping');

INSERT INTO public.app_modules (name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu)
SELECT v.name, v.display_name, v.description, v.icon, v.route,
       (SELECT id FROM public.app_modules WHERE name='organization_management'),
       v.sort_order, true, true
FROM (VALUES
  ('org_profile',                  'Organization Profile',                    'Core identity of the Social Security Board',              'Building',    '/admin/organization/profile',                10),
  ('org_locations',                'Locations / Branches / Service Centers',  'All SSB physical offices and service centers',            'MapPin',      '/admin/organization/locations',              20),
  ('dept_profiles',                'Departments & Units',                     'Manage SSB departments and operational units',            'Users',       '/admin/organization/departments',            30),
  ('org_media_library',            'Communication Assets Library',            'Central library of logos, seals, signatures, images',     'FileText',    '/admin/organization/media-library',          40),
  ('org_letterheads',              'Letterheads & Official Templates',        'Reusable official document layouts',                      'FileText',    '/admin/organization/letterheads',            50),
  ('org_notification_templates',   'Email / SMS / Notification Templates',    'Outbound email, SMS, WhatsApp and in-app templates',      'Mail',        '/admin/organization/notification-templates', 60),
  ('org_portal_branding',          'Public Portal Branding',                  'Branding for public, member and employer portals',        'Globe',       '/admin/organization/portal-branding',        70),
  ('org_document_assets',          'Receipt / Statement / Certificate Assets','Branding for receipts, statements and certificates',      'Receipt',     '/admin/organization/document-assets',        80),
  ('org_dept_mapping',             'Department Communication Mapping',        'Map departments to letterheads, signatures and assets',   'Network',     '/admin/organization/department-mapping',     90),
  ('org_usage_validation',         'Usage & Validation Dashboard',            'Missing or broken configuration before go-live',          'ShieldCheck', '/admin/organization/usage',                  100)
) AS v(name, display_name, description, icon, route, sort_order)
ON CONFLICT (name) DO UPDATE
SET display_name = EXCLUDED.display_name,
    description  = EXCLUDED.description,
    icon         = EXCLUDED.icon,
    route        = EXCLUDED.route,
    sort_order   = EXCLUDED.sort_order,
    parent_id    = EXCLUDED.parent_id,
    is_enabled   = true,
    show_in_menu = true;

INSERT INTO public.module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, a.action_name, a.display_name, a.display_name, true
FROM public.app_modules m
CROSS JOIN (VALUES ('view','View'), ('manage','Manage')) AS a(action_name, display_name)
WHERE m.name IN ('org_letterheads','org_notification_templates','org_portal_branding','org_document_assets','org_dept_mapping')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, m.id, ma.id, true
FROM public.roles r
JOIN public.app_modules m
  ON m.name IN ('org_letterheads','org_notification_templates','org_portal_branding','org_document_assets','org_dept_mapping')
JOIN public.module_actions ma
  ON ma.module_id = m.id
WHERE r.role_name IN ('Admin','Application Admin')
ON CONFLICT DO NOTHING;
