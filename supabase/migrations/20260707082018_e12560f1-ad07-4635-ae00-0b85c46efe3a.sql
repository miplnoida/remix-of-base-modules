
CREATE OR REPLACE VIEW public.core_offices_v AS
SELECT code AS office_code, description AS office_name, address1 AS address_line_1, address2 AS address_line_2,
       office_email AS email, office_phone AS phone, office_start_time, office_end_time, is_active
FROM public.tb_office;
GRANT SELECT ON public.core_offices_v TO authenticated, anon;
GRANT ALL ON public.core_offices_v TO service_role;

CREATE OR REPLACE VIEW public.core_departments_v AS
SELECT id AS department_id, office_code, name AS department_name, description, is_active, created_at, updated_at
FROM public.tb_office_departments;
GRANT SELECT ON public.core_departments_v TO authenticated, anon;
GRANT ALL ON public.core_departments_v TO service_role;

CREATE OR REPLACE VIEW public.core_designations_v AS
SELECT id AS designation_id, name AS designation_name, description, is_active, created_at, updated_at
FROM public.tb_designations;
GRANT SELECT ON public.core_designations_v TO authenticated, anon;
GRANT ALL ON public.core_designations_v TO service_role;

CREATE TABLE IF NOT EXISTS public.core_organization_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_code text NOT NULL UNIQUE DEFAULT 'SSB',
  organization_name text NOT NULL,
  legal_name text, short_name text, registration_number text, tax_identifier text,
  main_phone text, main_email text, website text,
  address_line_1 text, address_line_2 text, city text, district text, country text,
  logo_url text, branding_primary_color text, branding_secondary_color text,
  effective_from date, effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_organization_profile TO authenticated;
GRANT SELECT ON public.core_organization_profile TO anon;
GRANT ALL ON public.core_organization_profile TO service_role;

CREATE TABLE IF NOT EXISTS public.core_office_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_code text NOT NULL, location_code text, location_name text NOT NULL,
  location_type text NOT NULL DEFAULT 'OFFICE',
  address_line_1 text, address_line_2 text, city text, district text, country text,
  latitude numeric, longitude numeric, phone text, email text,
  is_primary boolean NOT NULL DEFAULT false, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT core_office_locations_type_chk CHECK (location_type IN ('OFFICE','BRANCH','SERVICE_CENTER','INSPECTION_ZONE','ARCHIVE','OTHER'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_office_locations TO authenticated;
GRANT SELECT ON public.core_office_locations TO anon;
GRANT ALL ON public.core_office_locations TO service_role;
CREATE INDEX IF NOT EXISTS core_office_locations_office_code_idx ON public.core_office_locations(office_code);

CREATE TABLE IF NOT EXISTS public.core_calendar_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date date NOT NULL, holiday_name text NOT NULL,
  holiday_type text NOT NULL DEFAULT 'PUBLIC',
  office_code text,
  applies_nationally boolean NOT NULL DEFAULT true,
  affects_workflow_deadlines boolean NOT NULL DEFAULT true,
  affects_payment_processing boolean NOT NULL DEFAULT false,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT core_calendar_holidays_type_chk CHECK (holiday_type IN ('PUBLIC','BANK','ORGANIZATION','REGIONAL','SPECIAL','OTHER')),
  CONSTRAINT core_calendar_holidays_uk UNIQUE (holiday_date, holiday_name, office_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_calendar_holidays TO authenticated;
GRANT SELECT ON public.core_calendar_holidays TO anon;
GRANT ALL ON public.core_calendar_holidays TO service_role;

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS core_organization_profile_uat ON public.core_organization_profile;
CREATE TRIGGER core_organization_profile_uat BEFORE UPDATE ON public.core_organization_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS core_office_locations_uat ON public.core_office_locations;
CREATE TRIGGER core_office_locations_uat BEFORE UPDATE ON public.core_office_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS core_calendar_holidays_uat ON public.core_calendar_holidays;
CREATE TRIGGER core_calendar_holidays_uat BEFORE UPDATE ON public.core_calendar_holidays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.core_organization_profile (organization_code, organization_name, legal_name, short_name, country, is_active)
SELECT 'SSB','Social Security Board','Social Security Board','SSB','KN',true
WHERE NOT EXISTS (SELECT 1 FROM public.core_organization_profile);

INSERT INTO public.core_table_registry
  (table_name, modern_alias, domain_code, module_code, table_category, ownership_type, is_legacy_table,
   canonical_admin_route, data_classification, lifecycle_status, description, is_active)
VALUES
  ('core_offices_v','core_office','ORGANISATION','CORE','MASTER','PLATFORM',false,'/admin/offices','INTERNAL','ACTIVE','Compatibility view over tb_office',true),
  ('core_departments_v','core_department','ORGANISATION','CORE','MASTER','PLATFORM',false,'/admin/departments','INTERNAL','ACTIVE','Compatibility view over tb_office_departments',true),
  ('core_designations_v','core_designation','ORGANISATION','CORE','MASTER','PLATFORM',false,'/admin/designations','INTERNAL','ACTIVE','Compatibility view over tb_designations',true),
  ('core_organization_profile','core_organization_profile','ORGANISATION','CORE','CONFIGURATION','PLATFORM',false,'/admin/organisation-profile','INTERNAL','ACTIVE','Canonical organization profile',true),
  ('core_office_locations','core_office_location','ORGANISATION','CORE','MASTER','PLATFORM',false,'/admin/locations','INTERNAL','ACTIVE','Canonical office locations',true),
  ('core_calendar_holidays','core_calendar_holiday','ORGANISATION','CORE','MASTER','PLATFORM',false,'/admin/calendar-holidays','INTERNAL','ACTIVE','Canonical calendar / holidays',true)
ON CONFLICT (table_name) DO UPDATE SET
  modern_alias = EXCLUDED.modern_alias, domain_code = EXCLUDED.domain_code, module_code = EXCLUDED.module_code,
  table_category = EXCLUDED.table_category, canonical_admin_route = EXCLUDED.canonical_admin_route,
  lifecycle_status = EXCLUDED.lifecycle_status, description = EXCLUDED.description, is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO public.core_table_registry
  (table_name, modern_alias, domain_code, module_code, table_category, ownership_type, is_legacy_table,
   legacy_schema_name, legacy_table_name, canonical_admin_route, data_classification, lifecycle_status, description, is_active)
VALUES
  ('tb_office','core_office','ORGANISATION','CORE','MASTER','PLATFORM',true,'public','tb_office','/admin/offices','INTERNAL','ACTIVE','Legacy office master (kept)',true),
  ('tb_office_departments','core_department','ORGANISATION','CORE','MASTER','PLATFORM',true,'public','tb_office_departments','/admin/departments','INTERNAL','ACTIVE','Legacy department master (kept)',true),
  ('tb_designations','core_designation','ORGANISATION','CORE','MASTER','PLATFORM',true,'public','tb_designations','/admin/designations','INTERNAL','ACTIVE','Legacy designation master (kept)',true)
ON CONFLICT (table_name) DO UPDATE SET
  is_legacy_table = EXCLUDED.is_legacy_table, legacy_schema_name = EXCLUDED.legacy_schema_name,
  legacy_table_name = EXCLUDED.legacy_table_name, canonical_admin_route = EXCLUDED.canonical_admin_route,
  updated_at = now();

INSERT INTO public.core_legacy_table_map
  (legacy_schema_name, legacy_table_name, modern_table_name, modern_entity_name, modern_alias,
   module_code, domain_code, table_category, use_strategy, mapping_status,
   canonical_view_name, canonical_admin_route, is_master_table, is_active, description)
VALUES
  ('public','tb_office','core_offices_v','Office','core_office','CORE','ORGANISATION','MASTER','VIEW','APPROVED','core_offices_v','/admin/offices',true,true,'Legacy office master wrapped via view'),
  ('public','tb_office_departments','core_departments_v','Department','core_department','CORE','ORGANISATION','MASTER','VIEW','APPROVED','core_departments_v','/admin/departments',true,true,'Legacy department master wrapped via view'),
  ('public','tb_designations','core_designations_v','Designation','core_designation','CORE','ORGANISATION','MASTER','VIEW','APPROVED','core_designations_v','/admin/designations',true,true,'Legacy designation master wrapped via view')
ON CONFLICT DO NOTHING;

DO $$
DECLARE m_office uuid; m_dept uuid; m_desig uuid;
BEGIN
  SELECT id INTO m_office FROM public.core_legacy_table_map WHERE legacy_table_name='tb_office' LIMIT 1;
  SELECT id INTO m_dept   FROM public.core_legacy_table_map WHERE legacy_table_name='tb_office_departments' LIMIT 1;
  SELECT id INTO m_desig  FROM public.core_legacy_table_map WHERE legacy_table_name='tb_designations' LIMIT 1;
  IF m_office IS NOT NULL THEN
    INSERT INTO public.core_legacy_column_map (table_map_id, legacy_column_name, modern_field_name, display_label, mapping_status, is_active) VALUES
      (m_office,'code','officeCode','Office Code','APPROVED',true),
      (m_office,'description','officeName','Office Name','APPROVED',true),
      (m_office,'address1','addressLine1','Address Line 1','APPROVED',true),
      (m_office,'address2','addressLine2','Address Line 2','APPROVED',true),
      (m_office,'office_email','email','Email','APPROVED',true),
      (m_office,'office_phone','phone','Phone','APPROVED',true),
      (m_office,'is_active','isActive','Active','APPROVED',true)
    ON CONFLICT DO NOTHING;
  END IF;
  IF m_dept IS NOT NULL THEN
    INSERT INTO public.core_legacy_column_map (table_map_id, legacy_column_name, modern_field_name, display_label, mapping_status, is_active) VALUES
      (m_dept,'id','departmentId','Department ID','APPROVED',true),
      (m_dept,'office_code','officeCode','Office Code','APPROVED',true),
      (m_dept,'name','departmentName','Department Name','APPROVED',true),
      (m_dept,'description','description','Description','APPROVED',true),
      (m_dept,'is_active','isActive','Active','APPROVED',true)
    ON CONFLICT DO NOTHING;
  END IF;
  IF m_desig IS NOT NULL THEN
    INSERT INTO public.core_legacy_column_map (table_map_id, legacy_column_name, modern_field_name, display_label, mapping_status, is_active) VALUES
      (m_desig,'id','designationId','Designation ID','APPROVED',true),
      (m_desig,'name','designationName','Designation Name','APPROVED',true),
      (m_desig,'description','description','Description','APPROVED',true),
      (m_desig,'is_active','isActive','Active','APPROVED',true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

INSERT INTO public.core_reference_source_map
  (reference_category_code, reference_group_code, source_type, source_view_name, legacy_table_name,
   modern_entity_name, admin_route, owner_module_code, owner_domain_code, is_primary_source,
   sync_strategy, lifecycle_status, description, is_active)
VALUES
  ('ORGANISATION','OFFICE','VIEW','core_offices_v','tb_office','Office','/admin/offices','CORE','ORGANISATION',true,'DIRECT','ACTIVE','Office master via compat view',true),
  ('ORGANISATION','DEPARTMENT','VIEW','core_departments_v','tb_office_departments','Department','/admin/departments','CORE','ORGANISATION',true,'DIRECT','ACTIVE','Department master via compat view',true),
  ('ORGANISATION','DESIGNATION','VIEW','core_designations_v','tb_designations','Designation','/admin/designations','CORE','ORGANISATION',true,'DIRECT','ACTIVE','Designation master via compat view',true),
  ('ORGANISATION','LOCATION_TYPE','STATIC_ENUM',NULL,NULL,'LocationType','/admin/locations','CORE','ORGANISATION',true,'READ_ONLY','ACTIVE','Static enum for location type',true),
  ('ORGANISATION','HOLIDAY_TYPE','STATIC_ENUM',NULL,NULL,'HolidayType','/admin/calendar-holidays','CORE','ORGANISATION',true,'READ_ONLY','ACTIVE','Static enum for holiday type',true),
  ('ORGANISATION','ORGANIZATION_STATUS','STATIC_ENUM',NULL,NULL,'OrganizationStatus','/admin/organisation-profile','CORE','ORGANISATION',true,'READ_ONLY','ACTIVE','Static enum for org status',true)
ON CONFLICT DO NOTHING;

INSERT INTO public.core_reference_consumer_map
  (reference_group_code, consumer_module_code, consumer_domain_code, usage_type, is_required, is_active, notes)
VALUES
  ('OFFICE','CORE','PEOPLE_ACCESS','LOOKUP',true,true,'Users & staff assignments'),
  ('DEPARTMENT','CORE','PEOPLE_ACCESS','LOOKUP',true,true,'Users & staff assignments'),
  ('DESIGNATION','CORE','PEOPLE_ACCESS','LOOKUP',true,true,'Users & staff assignments'),
  ('OFFICE','CORE','WORKFLOW','WORKFLOW',false,true,'Planned consumer'),
  ('DEPARTMENT','CORE','WORKFLOW','WORKFLOW',false,true,'Planned consumer'),
  ('HOLIDAY_TYPE','CORE','WORKFLOW','WORKFLOW',false,true,'Planned consumer'),
  ('OFFICE','CORE','REPORTING','REPORTING',false,true,'Reporting filters'),
  ('DEPARTMENT','CORE','REPORTING','REPORTING',false,true,'Reporting filters')
ON CONFLICT DO NOTHING;

INSERT INTO public.core_permission_registry
  (permission_key, permission_name, description, module_code, domain_code, permission_scope, action_code,
   is_platform_permission, is_sensitive_permission, is_admin_permission, risk_level, lifecycle_status,
   seeded_from_registry, source_file, is_active)
VALUES
  ('core.admin.organization.view','View Organization','View organization foundation','CORE','ORGANISATION','PAGE','view',true,false,true,'LOW','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.organization.manage','Manage Organization','Manage organization foundation','CORE','ORGANISATION','ADMIN','manage',true,false,true,'MEDIUM','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.locations.view','View Office Locations',NULL,'CORE','ORGANISATION','PAGE','view',true,false,true,'LOW','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.locations.manage','Manage Office Locations',NULL,'CORE','ORGANISATION','ADMIN','manage',true,false,true,'MEDIUM','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.calendar.view','View Calendar & Holidays',NULL,'CORE','ORGANISATION','PAGE','view',true,false,true,'LOW','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.calendar.manage','Manage Calendar & Holidays',NULL,'CORE','ORGANISATION','ADMIN','manage',true,false,true,'MEDIUM','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.organization_profile.view','View Organization Profile',NULL,'CORE','ORGANISATION','PAGE','view',true,false,true,'LOW','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true),
  ('core.admin.organization_profile.manage','Manage Organization Profile',NULL,'CORE','ORGANISATION','ADMIN','manage',true,true,true,'HIGH','ACTIVE',true,'src/platform/rbac/core.permissions.ts',true)
ON CONFLICT (permission_key) DO UPDATE SET
  permission_name = EXCLUDED.permission_name, domain_code = EXCLUDED.domain_code,
  permission_scope = EXCLUDED.permission_scope, action_code = EXCLUDED.action_code,
  is_platform_permission = EXCLUDED.is_platform_permission, is_sensitive_permission = EXCLUDED.is_sensitive_permission,
  is_admin_permission = EXCLUDED.is_admin_permission, risk_level = EXCLUDED.risk_level,
  lifecycle_status = EXCLUDED.lifecycle_status, source_file = EXCLUDED.source_file, is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO public.core_admin_route_registry
  (route_path, page_name, admin_domain, canonical_status, owner_module_code, description,
   requires_permission, show_in_platform_admin, is_active)
VALUES
  ('/admin/organisation-profile','Organization Profile','ORGANISATION','CANONICAL','CORE','Organization profile','core.admin.organization_profile.view',true,true),
  ('/admin/locations','Office Locations','ORGANISATION','CANONICAL','CORE','Office locations master','core.admin.locations.view',true,true),
  ('/admin/calendar-holidays','Calendar & Holidays','ORGANISATION','CANONICAL','CORE','Calendar & holidays','core.admin.calendar.view',true,true)
ON CONFLICT (route_path) DO UPDATE SET
  page_name = EXCLUDED.page_name, admin_domain = EXCLUDED.admin_domain,
  canonical_status = EXCLUDED.canonical_status, owner_module_code = EXCLUDED.owner_module_code,
  requires_permission = EXCLUDED.requires_permission, show_in_platform_admin = EXCLUDED.show_in_platform_admin,
  is_active = EXCLUDED.is_active, updated_at = now();
