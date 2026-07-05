
-- ============================================================
-- Phase 2.2 — Geography Domain Pack (additive schema)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ssp_country_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL UNIQUE,
  country_name text NOT NULL,
  iso_alpha2 text,
  iso_alpha3 text,
  iso_numeric text,
  default_timezone text,
  default_locale text,
  default_currency text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_country_profile TO authenticated;
GRANT ALL ON public.ssp_country_profile TO service_role;
GRANT SELECT ON public.ssp_country_profile TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_admin_level (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  level_no integer NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  plural_name text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, level_no),
  UNIQUE (country_code, code)
);
CREATE INDEX IF NOT EXISTS idx_ssp_admin_level_country ON public.ssp_admin_level(country_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_admin_level TO authenticated;
GRANT ALL ON public.ssp_admin_level TO service_role;
GRANT SELECT ON public.ssp_admin_level TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_geo_area (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  level_no integer NOT NULL,
  parent_id uuid REFERENCES public.ssp_geo_area(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  geo_codes jsonb NOT NULL DEFAULT '{}'::jsonb,
  external_codes jsonb NOT NULL DEFAULT '{}'::jsonb,
  timezone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, level_no, code)
);
CREATE INDEX IF NOT EXISTS idx_ssp_geo_area_country_level ON public.ssp_geo_area(country_code, level_no);
CREATE INDEX IF NOT EXISTS idx_ssp_geo_area_parent ON public.ssp_geo_area(parent_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_geo_area TO authenticated;
GRANT ALL ON public.ssp_geo_area TO service_role;
GRANT SELECT ON public.ssp_geo_area TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_address_format (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  format_name text NOT NULL DEFAULT 'default',
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  display_template text,
  sample text,
  is_default boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, format_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_address_format TO authenticated;
GRANT ALL ON public.ssp_address_format TO service_role;
GRANT SELECT ON public.ssp_address_format TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_postal_rule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  pattern text NOT NULL,
  example text,
  is_required boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, pattern)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_postal_rule TO authenticated;
GRANT ALL ON public.ssp_postal_rule TO service_role;
GRANT SELECT ON public.ssp_postal_rule TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_jurisdiction (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'administrative',
  parent_id uuid REFERENCES public.ssp_jurisdiction(id) ON DELETE SET NULL,
  geo_area_id uuid REFERENCES public.ssp_geo_area(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_jurisdiction TO authenticated;
GRANT ALL ON public.ssp_jurisdiction TO service_role;
GRANT SELECT ON public.ssp_jurisdiction TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_country_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  policy_key text NOT NULL,
  policy_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, policy_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_country_policy TO authenticated;
GRANT ALL ON public.ssp_country_policy TO service_role;
GRANT SELECT ON public.ssp_country_policy TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_geo_external_code (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  system_code text NOT NULL,
  entity_kind text NOT NULL,
  entity_ref text NOT NULL,
  external_code text NOT NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, system_code, entity_kind, entity_ref)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_geo_external_code TO authenticated;
GRANT ALL ON public.ssp_geo_external_code TO service_role;
GRANT SELECT ON public.ssp_geo_external_code TO anon;

-- ============================================================
-- app_modules registration under Administration parent
-- ============================================================
INSERT INTO public.app_modules (
  id, name, display_name, description, icon, route, parent_id,
  sort_order, is_enabled, show_in_menu, routes_enabled, actions_enabled
) VALUES (
  '2c2c0000-0000-4000-8000-000000000220'::uuid,
  'geography_domain',
  'Geography',
  'Shared Social Security Geography Domain: countries, administrative hierarchy, geo areas, address formats, jurisdictions, policies, external codes.',
  'Globe',
  '/admin/geography',
  'aab5fcb8-51fb-4a5c-8a87-6cef31068b47'::uuid,
  75,
  true,
  true,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description  = EXCLUDED.description,
  route        = EXCLUDED.route,
  parent_id    = EXCLUDED.parent_id,
  icon         = EXCLUDED.icon,
  is_enabled   = true,
  show_in_menu = true,
  routes_enabled = true,
  actions_enabled = true;

-- Actions + role grants
DO $$
DECLARE
  v_module_id uuid := '2c2c0000-0000-4000-8000-000000000220'::uuid;
  v_action_id uuid;
  r RECORD;
  a RECORD;
BEGIN
  FOR a IN SELECT * FROM (VALUES
      ('view',   'View Geography Domain'),
      ('manage', 'Manage Geography Domain (countries, levels, areas, address formats, policies)'),
      ('admin',  'Administer Geography Domain (governance, lifecycle)'),
      ('import', 'Import Geography reference data'),
      ('export', 'Export Geography reference data')
    ) AS t(action_name, display_name)
  LOOP
    INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
    SELECT v_module_id, a.action_name, a.display_name, TRUE
     WHERE NOT EXISTS (
       SELECT 1 FROM public.module_actions
        WHERE module_id = v_module_id AND action_name = a.action_name
     );
  END LOOP;

  FOR r IN
    SELECT id AS role_id, role_name
      FROM public.roles
     WHERE role_name IN ('Admin','Application Admin','Super Admin')
  LOOP
    FOR a IN SELECT action_name FROM (VALUES ('view'),('manage'),('admin'),('import'),('export')) AS t(action_name)
    LOOP
      SELECT id INTO v_action_id
        FROM public.module_actions
       WHERE module_id = v_module_id AND action_name = a.action_name;

      IF v_action_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
        SELECT r.role_id, v_module_id, v_action_id, TRUE
         WHERE NOT EXISTS (
           SELECT 1 FROM public.role_permissions
            WHERE role_id = r.role_id
              AND module_id = v_module_id
              AND action_id = v_action_id
         );
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- Enterprise Catalogue / Capability Registry
-- ============================================================
INSERT INTO public.enterprise_capability_registry (
  capability_key, capability_name, category, grouping, owner, status, version,
  canonical_route, menu_module_name, permission_hint,
  consumers, dependencies,
  documentation_link, architecture_link, acceptance_link,
  health_architecture, health_implementation, health_menu, health_permissions,
  health_documentation, health_acceptance, health_migration, overall_health,
  description, is_active, sort_order
) VALUES (
  'geography_domain',
  'Geography Domain Pack',
  'shared_domain',
  'Social Security Shared Domain',
  'Social Security Shared Domain',
  'active',
  '1.0.0',
  '/admin/geography',
  'geography_domain',
  'geography_domain:view',
  ARRAY['organisation','identity','employer','member','bn','contributions','compliance','legal','finance','hrms','prison','licensing'],
  ARRAY['reference_framework','master_data_platform','organisation_foundation'],
  'docs/social-security/EPIC_2_2_GEOGRAPHY_DOMAIN_PACK_ACCEPTANCE.md',
  'docs/social-security/PHASE_2_SOCIAL_SECURITY_SHARED_DOMAIN_PROGRAMME.md',
  'docs/social-security/EPIC_2_2_GEOGRAPHY_DOMAIN_PACK_ACCEPTANCE.md',
  'green','green','green','green','green','green','green','green',
  'Shared canonical Geography foundation consumed by every Social Security module.',
  true, 220
)
ON CONFLICT (capability_key) DO UPDATE SET
  capability_name = EXCLUDED.capability_name,
  status = 'active',
  version = EXCLUDED.version,
  canonical_route = EXCLUDED.canonical_route,
  menu_module_name = EXCLUDED.menu_module_name,
  permission_hint = EXCLUDED.permission_hint,
  consumers = EXCLUDED.consumers,
  dependencies = EXCLUDED.dependencies,
  documentation_link = EXCLUDED.documentation_link,
  architecture_link = EXCLUDED.architecture_link,
  acceptance_link = EXCLUDED.acceptance_link,
  health_architecture = 'green',
  health_implementation = 'green',
  health_menu = 'green',
  health_permissions = 'green',
  health_documentation = 'green',
  health_acceptance = 'green',
  overall_health = 'green',
  description = EXCLUDED.description,
  is_active = true,
  updated_at = now();
