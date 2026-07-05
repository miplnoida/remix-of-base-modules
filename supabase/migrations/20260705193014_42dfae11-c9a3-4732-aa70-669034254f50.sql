
-- Epic 2.6 — Participant / Party Domain Pack (additive ssp_participant_*; no RLS, role-based security).
-- Consumes Geography, Identity, Financial Reference, Legal Reference, Reference Framework.
-- Does NOT modify legacy ip_*, er_*, BN, BEMA, Compliance, IA, Legal tables.

CREATE TABLE IF NOT EXISTS public.ssp_party_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'party',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_party_type TO authenticated;
GRANT ALL ON public.ssp_party_type TO service_role;
GRANT SELECT ON public.ssp_party_type TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_participant_role (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'operational',
  applies_to text[] NOT NULL DEFAULT '{}',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_participant_role TO authenticated;
GRANT ALL ON public.ssp_participant_role TO service_role;
GRANT SELECT ON public.ssp_participant_role TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_relationship_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  reciprocal_code text,
  category text NOT NULL DEFAULT 'family',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_relationship_type TO authenticated;
GRANT ALL ON public.ssp_relationship_type TO service_role;
GRANT SELECT ON public.ssp_relationship_type TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_member_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_member_type TO authenticated;
GRANT ALL ON public.ssp_member_type TO service_role;
GRANT SELECT ON public.ssp_member_type TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_employer_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_employer_type TO authenticated;
GRANT ALL ON public.ssp_employer_type TO service_role;
GRANT SELECT ON public.ssp_employer_type TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_occupation_category (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  isco_code text,
  parent_code text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_occupation_category TO authenticated;
GRANT ALL ON public.ssp_occupation_category TO service_role;
GRANT SELECT ON public.ssp_occupation_category TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_nationality (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  country_code text,
  is_default_domestic boolean NOT NULL DEFAULT false,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_nationality TO authenticated;
GRANT ALL ON public.ssp_nationality TO service_role;
GRANT SELECT ON public.ssp_nationality TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_disability_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_disability_type TO authenticated;
GRANT ALL ON public.ssp_disability_type TO service_role;
GRANT SELECT ON public.ssp_disability_type TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_life_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_terminal boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_life_status TO authenticated;
GRANT ALL ON public.ssp_life_status TO service_role;
GRANT SELECT ON public.ssp_life_status TO anon;

-- Party-role binding: canonical link allowing one party to hold multiple roles over time.
-- party_kind + party_ref identify the party (compatible with ssp_party_identity).
CREATE TABLE IF NOT EXISTS public.ssp_party_role_binding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_kind text NOT NULL,
  party_ref text NOT NULL,
  role_code text NOT NULL,
  scope_code text,
  effective_from date,
  effective_to date,
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ssp_prb_party ON public.ssp_party_role_binding(party_kind, party_ref);
CREATE INDEX IF NOT EXISTS idx_ssp_prb_role  ON public.ssp_party_role_binding(role_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_party_role_binding TO authenticated;
GRANT ALL ON public.ssp_party_role_binding TO service_role;
GRANT SELECT ON public.ssp_party_role_binding TO anon;

-- ---------------------------------------------------------------------------
-- Baseline seed (KN-ready)
-- ---------------------------------------------------------------------------

INSERT INTO public.ssp_party_type (code, name, category, sort_order) VALUES
  ('PERSON',        'Person',         'individual',    10),
  ('EMPLOYER',      'Employer',       'organisation',  20),
  ('ORGANISATION',  'Organisation',   'organisation',  30),
  ('REPRESENTATIVE','Representative', 'individual',    40),
  ('DEPENDANT',     'Dependant',      'individual',    50),
  ('NOMINEE',       'Nominee',        'individual',    60),
  ('STAFF',         'Staff',          'internal',      70),
  ('EXTERNAL_USER', 'External User',  'external',      80)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.ssp_participant_role (code, name, category, applies_to, sort_order) VALUES
  ('MEMBER',           'Member',            'core',        ARRAY['PERSON'], 10),
  ('CONTRIBUTOR',      'Contributor',       'core',        ARRAY['PERSON','EMPLOYER'], 20),
  ('BENEFICIARY',      'Beneficiary',       'core',        ARRAY['PERSON'], 30),
  ('CLAIMANT',         'Claimant',          'core',        ARRAY['PERSON','REPRESENTATIVE'], 40),
  ('EMPLOYER',         'Employer',          'core',        ARRAY['EMPLOYER','ORGANISATION'], 50),
  ('EMPLOYER_CONTACT', 'Employer Contact',  'contact',     ARRAY['PERSON'], 60),
  ('REPRESENTATIVE',   'Representative',    'contact',     ARRAY['PERSON','ORGANISATION'], 70),
  ('DEPENDANT',        'Dependant',         'relationship',ARRAY['PERSON'], 80),
  ('NOMINEE',          'Nominee',           'relationship',ARRAY['PERSON'], 90),
  ('OFFICER',          'Officer',           'internal',    ARRAY['STAFF'], 100)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.ssp_relationship_type (code, name, reciprocal_code, category, sort_order) VALUES
  ('SPOUSE',           'Spouse',              'SPOUSE',  'family',        10),
  ('CHILD',            'Child',               'PARENT',  'family',        20),
  ('PARENT',           'Parent',              'CHILD',   'family',        30),
  ('GUARDIAN',         'Guardian',            'WARD',    'family',        40),
  ('WARD',             'Ward',                'GUARDIAN','family',        50),
  ('LEGAL_REP',        'Legal Representative',NULL,      'legal',         60),
  ('EMPLOYER_CONTACT', 'Employer Contact',    NULL,      'organisation',  70)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.ssp_member_type (code, name, sort_order) VALUES
  ('EMPLOYED',      'Employed',       10),
  ('SELF_EMPLOYED', 'Self-employed',  20),
  ('VOLUNTARY',     'Voluntary',      30),
  ('PENSIONER',     'Pensioner',      40),
  ('BENEFICIARY',   'Beneficiary',    50)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.ssp_employer_type (code, name, sort_order) VALUES
  ('PRIVATE',         'Private Employer',        10),
  ('GOVERNMENT',      'Government',              20),
  ('STATUTORY_BODY',  'Statutory Body',          30),
  ('SELF_EMPLOYED',   'Self-employed Employer',  40)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.ssp_life_status (code, name, is_terminal, sort_order) VALUES
  ('ALIVE',    'Alive',    false, 10),
  ('DECEASED', 'Deceased', true,  20),
  ('UNKNOWN',  'Unknown',  false, 30)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.ssp_nationality (code, name, country_code, is_default_domestic, sort_order) VALUES
  ('KN_KITTITIAN_NEVISIAN', 'Kittitian and Nevisian', 'KN', true, 10),
  ('OTHER',                 'Other',                  NULL, false, 90)
ON CONFLICT (code) DO NOTHING;

-- Minimal occupation baseline (ISCO-08 top level). Extend later.
INSERT INTO public.ssp_occupation_category (code, name, isco_code, sort_order) VALUES
  ('OCC_1', 'Managers',                                            '1', 10),
  ('OCC_2', 'Professionals',                                       '2', 20),
  ('OCC_3', 'Technicians and Associate Professionals',             '3', 30),
  ('OCC_4', 'Clerical Support Workers',                            '4', 40),
  ('OCC_5', 'Service and Sales Workers',                           '5', 50),
  ('OCC_6', 'Skilled Agricultural, Forestry and Fishery Workers',  '6', 60),
  ('OCC_7', 'Craft and Related Trades Workers',                    '7', 70),
  ('OCC_8', 'Plant and Machine Operators and Assemblers',          '8', 80),
  ('OCC_9', 'Elementary Occupations',                              '9', 90),
  ('OCC_0', 'Armed Forces Occupations',                            '0', 100)
ON CONFLICT (code) DO NOTHING;

-- Disability seed intentionally minimal — extend after clinical review.
INSERT INTO public.ssp_disability_type (code, name, category, sort_order) VALUES
  ('NONE',        'None',        'general', 10),
  ('PHYSICAL',    'Physical',    'general', 20),
  ('SENSORY',     'Sensory',     'general', 30),
  ('COGNITIVE',   'Cognitive',   'general', 40),
  ('PSYCHOSOCIAL','Psychosocial','general', 50),
  ('OTHER',       'Other',       'general', 90)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- App module registration + role permissions
-- ---------------------------------------------------------------------------

INSERT INTO public.app_modules (
  id, name, display_name, description, icon, route, parent_id,
  sort_order, is_enabled, show_in_menu, routes_enabled, actions_enabled
) VALUES (
  '2c2c0000-0000-4000-8000-000000000260'::uuid,
  'participant_domain',
  'Participant Domain',
  'Shared Social Security Participant / Party Domain: party types, participant roles, relationships, member/employer types, occupations, nationalities, disability, life status and party-role bindings.',
  'Users',
  '/admin/participant',
  'aab5fcb8-51fb-4a5c-8a87-6cef31068b47'::uuid,
  79, true, true, true, true
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
  v_module_id uuid := '2c2c0000-0000-4000-8000-000000000260'::uuid;
  v_action_id uuid;
  r RECORD;
  a RECORD;
BEGIN
  FOR a IN SELECT * FROM (VALUES
      ('view',   'View Participant Domain'),
      ('manage', 'Manage Participant Domain (types, roles, relationships, bindings)'),
      ('admin',  'Administer Participant Domain (governance, lifecycle)'),
      ('import', 'Import Participant Domain data'),
      ('export', 'Export Participant Domain data')
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
  'participant_domain',
  'Participant / Party Domain Pack',
  'shared_domain',
  'Social Security Shared Domain',
  'Social Security Shared Domain',
  'active',
  '1.0.0',
  '/admin/participant',
  'participant_domain',
  'participant_domain:view',
  ARRAY['member','employer','bn','claims','contributions','compliance','legal','finance','hrms','prison','licensing','portals'],
  ARRAY['reference_framework','master_data_platform','geography_domain','identity_domain','financial_reference_domain','legal_reference_domain'],
  'docs/social-security/EPIC_2_6_PARTICIPANT_DOMAIN_PACK_ACCEPTANCE.md',
  'docs/social-security/PHASE_2_SOCIAL_SECURITY_SHARED_DOMAIN_PROGRAMME.md',
  'docs/social-security/EPIC_2_6_PARTICIPANT_DOMAIN_PACK_ACCEPTANCE.md',
  'green','green','green','green','green','green','amber','green',
  'Shared canonical Participant / Party foundation: party types, participant roles, relationships, member/employer types, occupations, nationalities, disability, life status and party-role bindings. Consumes Geography, Identity, Financial Reference, Legal Reference. No structural change to legacy ip_*/er_*/BN/BEMA/Compliance tables.',
  true, 260
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
