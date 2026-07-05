
-- Phase 2.5 — Legal Reference Domain Pack (additive; no RLS, role-based security)

CREATE TABLE IF NOT EXISTS public.ssp_legal_reference_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_code text NOT NULL UNIQUE,
  type_name text NOT NULL,
  category text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_legal_reference_type TO authenticated;
GRANT ALL ON public.ssp_legal_reference_type TO service_role;
GRANT SELECT ON public.ssp_legal_reference_type TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_legal_act (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  act_code text NOT NULL,
  act_name text NOT NULL,
  short_title text,
  category text,
  chapter text,
  year integer,
  effective_from date,
  effective_to date,
  supersedes_id uuid,
  status text NOT NULL DEFAULT 'active',
  source_url text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, act_code)
);
CREATE INDEX IF NOT EXISTS idx_ssp_legal_act_country ON public.ssp_legal_act(country_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_legal_act TO authenticated;
GRANT ALL ON public.ssp_legal_act TO service_role;
GRANT SELECT ON public.ssp_legal_act TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_legal_section (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  act_id uuid NOT NULL REFERENCES public.ssp_legal_act(id) ON DELETE CASCADE,
  section_code text NOT NULL,
  section_title text NOT NULL,
  subsection text NOT NULL DEFAULT '',
  section_text text,
  effective_from date,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (act_id, section_code, subsection)
);
CREATE INDEX IF NOT EXISTS idx_ssp_legal_section_act ON public.ssp_legal_section(act_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_legal_section TO authenticated;
GRANT ALL ON public.ssp_legal_section TO service_role;
GRANT SELECT ON public.ssp_legal_section TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_regulation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  regulation_code text NOT NULL,
  regulation_name text NOT NULL,
  parent_act_id uuid REFERENCES public.ssp_legal_act(id) ON DELETE SET NULL,
  category text,
  effective_from date,
  effective_to date,
  status text NOT NULL DEFAULT 'active',
  source_url text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, regulation_code)
);
CREATE INDEX IF NOT EXISTS idx_ssp_regulation_country ON public.ssp_regulation(country_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_regulation TO authenticated;
GRANT ALL ON public.ssp_regulation TO service_role;
GRANT SELECT ON public.ssp_regulation TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_court_reference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  court_code text NOT NULL,
  court_name text NOT NULL,
  court_level text,
  jurisdiction_id uuid,
  parent_court_id uuid REFERENCES public.ssp_court_reference(id) ON DELETE SET NULL,
  legacy_court_ref text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, court_code)
);
CREATE INDEX IF NOT EXISTS idx_ssp_court_country ON public.ssp_court_reference(country_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_court_reference TO authenticated;
GRANT ALL ON public.ssp_court_reference TO service_role;
GRANT SELECT ON public.ssp_court_reference TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_legal_reference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  ref_code text NOT NULL,
  ref_type_code text,
  short_title text NOT NULL,
  full_citation text,
  act_id uuid REFERENCES public.ssp_legal_act(id) ON DELETE SET NULL,
  section_id uuid REFERENCES public.ssp_legal_section(id) ON DELETE SET NULL,
  regulation_id uuid REFERENCES public.ssp_regulation(id) ON DELETE SET NULL,
  jurisdiction_id uuid,
  effective_from date,
  effective_to date,
  status text NOT NULL DEFAULT 'active',
  penalty_scale jsonb,
  tags text[],
  source_url text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, ref_code)
);
CREATE INDEX IF NOT EXISTS idx_ssp_legal_ref_country ON public.ssp_legal_reference(country_code);
CREATE INDEX IF NOT EXISTS idx_ssp_legal_ref_act ON public.ssp_legal_reference(act_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_legal_reference TO authenticated;
GRANT ALL ON public.ssp_legal_reference TO service_role;
GRANT SELECT ON public.ssp_legal_reference TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_legal_external_code (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_code text NOT NULL,
  entity_type text NOT NULL,
  local_ref uuid NOT NULL,
  external_code text NOT NULL,
  external_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (system_code, entity_type, external_code)
);
CREATE INDEX IF NOT EXISTS idx_ssp_legal_ext_lookup ON public.ssp_legal_external_code(entity_type, local_ref);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_legal_external_code TO authenticated;
GRANT ALL ON public.ssp_legal_external_code TO service_role;
GRANT SELECT ON public.ssp_legal_external_code TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_country_legal_applicability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  entity_type text NOT NULL,
  entity_ref uuid NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  effective_from date,
  effective_to date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, entity_type, entity_ref)
);
CREATE INDEX IF NOT EXISTS idx_ssp_cla_country ON public.ssp_country_legal_applicability(country_code, entity_type);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_country_legal_applicability TO authenticated;
GRANT ALL ON public.ssp_country_legal_applicability TO service_role;
GRANT SELECT ON public.ssp_country_legal_applicability TO anon;

INSERT INTO public.ssp_legal_reference_type (type_code, type_name, category, sort_order) VALUES
  ('ACT',        'Act / Statute',        'primary',   10),
  ('SECTION',    'Section',              'primary',   20),
  ('SUBSECTION', 'Subsection',           'primary',   30),
  ('REGULATION', 'Regulation',           'secondary', 40),
  ('SI',         'Statutory Instrument', 'secondary', 50),
  ('ORDER',      'Order',                'secondary', 60),
  ('NOTICE',     'Notice',               'secondary', 70),
  ('POLICY',     'Policy',               'internal',  80),
  ('GUIDELINE',  'Guideline',            'internal',  90)
ON CONFLICT (type_code) DO NOTHING;

INSERT INTO public.app_modules (
  id, name, display_name, description, icon, route, parent_id,
  sort_order, is_enabled, show_in_menu, routes_enabled, actions_enabled
) VALUES (
  '2c2c0000-0000-4000-8000-000000000250'::uuid,
  'legal_reference_domain',
  'Legal Reference',
  'Shared Social Security Legal Reference Domain: acts, sections, regulations, jurisdictions, courts, legal references, external codes, country applicability.',
  'Scale',
  '/admin/legal-reference',
  'aab5fcb8-51fb-4a5c-8a87-6cef31068b47'::uuid,
  78, true, true, true, true
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

DO $$
DECLARE
  v_module_id uuid := '2c2c0000-0000-4000-8000-000000000250'::uuid;
  v_action_id uuid;
  r RECORD;
  a RECORD;
BEGIN
  FOR a IN SELECT * FROM (VALUES
      ('view',   'View Legal Reference Domain'),
      ('manage', 'Manage Legal Reference (acts, sections, regulations, courts, references)'),
      ('admin',  'Administer Legal Reference Domain (governance, lifecycle)'),
      ('import', 'Import Legal Reference data'),
      ('export', 'Export Legal Reference data')
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
            WHERE role_id = r.role_id AND module_id = v_module_id AND action_id = v_action_id
         );
      END IF;
    END LOOP;
  END LOOP;
END $$;

INSERT INTO public.enterprise_capability_registry (
  capability_key, capability_name, category, grouping, owner, status, version,
  canonical_route, menu_module_name, permission_hint,
  consumers, dependencies,
  documentation_link, architecture_link, acceptance_link,
  health_architecture, health_implementation, health_menu, health_permissions,
  health_documentation, health_acceptance, health_migration, overall_health,
  description, is_active, sort_order
) VALUES (
  'legal_reference_domain',
  'Legal Reference Domain Pack',
  'shared_domain',
  'Social Security Shared Domain',
  'Social Security Shared Domain',
  'active',
  '1.0.0',
  '/admin/legal-reference',
  'legal_reference_domain',
  'legal_reference_domain:view',
  ARRAY['bn','claims','product_builder','compliance','legal','finance','employer','member','portals','hrms','prison','licensing'],
  ARRAY['reference_framework','geography_domain','default_country_kn','identity_domain','financial_reference_domain'],
  'docs/social-security/EPIC_2_5_LEGAL_REFERENCE_DOMAIN_PACK_ACCEPTANCE.md',
  'docs/social-security/PHASE_2_SOCIAL_SECURITY_SHARED_DOMAIN_PROGRAMME.md',
  'docs/social-security/EPIC_2_5_LEGAL_REFERENCE_DOMAIN_PACK_ACCEPTANCE.md',
  'green','green','green','green','green','green','amber','green',
  'Shared canonical Legal Reference foundation: acts, sections, regulations, courts, legal references, penalty scales, external codes, country applicability. Reuses ssp_jurisdiction and Geography Domain Pack.',
  true, 250
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
  overall_health = 'green',
  description = EXCLUDED.description,
  is_active = true,
  updated_at = now();
