
-- Schema gap-fill on core_organization
ALTER TABLE public.core_organization
  ADD COLUMN IF NOT EXISTS registration_no TEXT,
  ADD COLUMN IF NOT EXISTS main_email TEXT,
  ADD COLUMN IF NOT EXISTS main_phone TEXT,
  ADD COLUMN IF NOT EXISTS logo_asset_id TEXT,
  ADD COLUMN IF NOT EXISTS seal_asset_id TEXT;

-- Schema gap-fill on office_locations (office_hours already exists)
ALTER TABLE public.office_locations
  ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'BRANCH',
  ADD COLUMN IF NOT EXISTS island_or_region TEXT,
  ADD COLUMN IF NOT EXISTS parish_city TEXT,
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- Enrich the existing seed offices for SKN
UPDATE public.office_locations
SET country = COALESCE(country, 'KN'),
    location_type = 'HEAD_OFFICE',
    island_or_region = COALESCE(island_or_region, 'Saint Kitts'),
    parish_city = COALESCE(parish_city, 'Basseterre'),
    is_primary = true
WHERE branch_name = 'Head Office';

UPDATE public.office_locations
SET country = COALESCE(country, 'KN'),
    location_type = 'BRANCH',
    island_or_region = COALESCE(island_or_region, 'Nevis'),
    parish_city = COALESCE(parish_city, 'Charlestown')
WHERE branch_name = 'Nevis Branch';

-- Menu: Organization Management hierarchy in app_modules
INSERT INTO public.app_modules (name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu)
SELECT 'organization_management', 'Organization Management',
       'Org profile, locations, communication assets, department profiles',
       'Building2', NULL,
       (SELECT id FROM public.app_modules WHERE name='system_admin' LIMIT 1),
       50, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.app_modules WHERE name='organization_management');

INSERT INTO public.app_modules (name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu)
SELECT v.name, v.display_name, v.description, v.icon, v.route,
       (SELECT id FROM public.app_modules WHERE name='organization_management'),
       v.sort_order, true, true
FROM (VALUES
  ('org_profile','Organization Profile','Manage organization identity and branding','Building','/admin/organization/profile',10),
  ('org_locations','Locations / Branches','Offices and branches','MapPin','/admin/organization/locations',20),
  ('org_comm_assets','Communication Assets','Letterheads, signatures, disclaimers, footers','FileText','/admin/organization/communication-assets',30),
  ('dept_profiles','Department Profiles','Generic department configuration','Users','/admin/organization/departments',40),
  ('org_usage_validation','Usage & Validation','Where org/dept/assets are referenced','ShieldCheck','/admin/organization/usage',50)
) AS v(name, display_name, description, icon, route, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.app_modules WHERE name=v.name);

-- Permission actions in module_actions (uses module_id)
INSERT INTO public.module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, v.action_name, v.display_name, v.display_name, true
FROM (VALUES
  ('org_profile','view','View Organization Profile'),
  ('org_profile','edit','Edit Organization Profile'),
  ('org_locations','view','View Locations'),
  ('org_locations','manage','Manage Locations'),
  ('org_comm_assets','view','View Communication Assets'),
  ('org_comm_assets','manage','Manage Communication Assets'),
  ('dept_profiles','view','View Department Profiles'),
  ('dept_profiles','edit','Edit Department Profiles'),
  ('lg_profile','view','View Legal Department Profile'),
  ('lg_profile','edit','Edit Legal Department Profile')
) AS v(module_name, action_name, display_name)
JOIN public.app_modules m ON m.name = v.module_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.module_actions ma
  WHERE ma.module_id = m.id AND ma.action_name = v.action_name
);
