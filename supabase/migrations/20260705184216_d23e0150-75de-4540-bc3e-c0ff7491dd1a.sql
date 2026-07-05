
-- ============================================================
-- Phase 2.3 — Identity Domain Pack (additive schema)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ssp_identity_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'government',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_identity_type TO authenticated;
GRANT ALL ON public.ssp_identity_type TO service_role;
GRANT SELECT ON public.ssp_identity_type TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_identity_validation_pattern (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  regex text NOT NULL,
  checksum_algorithm text,
  sample text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_identity_validation_pattern TO authenticated;
GRANT ALL ON public.ssp_identity_validation_pattern TO service_role;
GRANT SELECT ON public.ssp_identity_validation_pattern TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_country_identity_rule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  identity_type_code text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  is_mandatory boolean NOT NULL DEFAULT false,
  format_hint text,
  min_length integer,
  max_length integer,
  regex text,
  checksum_algorithm text,
  validation_pattern_code text,
  expiry_required boolean NOT NULL DEFAULT false,
  issuing_authority text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, identity_type_code)
);
CREATE INDEX IF NOT EXISTS idx_ssp_cir_country ON public.ssp_country_identity_rule(country_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_country_identity_rule TO authenticated;
GRANT ALL ON public.ssp_country_identity_rule TO service_role;
GRANT SELECT ON public.ssp_country_identity_rule TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_party_identity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_kind text NOT NULL,             -- member | employer | dependant | nominee | representative | staff | portal_user | other
  party_ref text NOT NULL,              -- opaque canonical id (uuid, ssn, regno, etc. as string)
  country_code text NOT NULL,
  identity_type_code text NOT NULL,
  identity_value text NOT NULL,
  normalised_value text,
  issued_on date,
  expires_on date,
  issuing_authority text,
  is_primary boolean NOT NULL DEFAULT false,
  verification_status text NOT NULL DEFAULT 'unverified',
  last_verified_at timestamptz,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (party_kind, party_ref, country_code, identity_type_code, identity_value)
);
CREATE INDEX IF NOT EXISTS idx_ssp_party_identity_party ON public.ssp_party_identity(party_kind, party_ref);
CREATE INDEX IF NOT EXISTS idx_ssp_party_identity_lookup ON public.ssp_party_identity(country_code, identity_type_code, normalised_value);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_party_identity TO authenticated;
GRANT ALL ON public.ssp_party_identity TO service_role;
GRANT SELECT ON public.ssp_party_identity TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_external_identity_ref (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_kind text NOT NULL,
  party_ref text NOT NULL,
  system_code text NOT NULL,            -- e.g. legacy_bema, legacy_bn, tax_registry, passport_registry, eid
  external_ref text NOT NULL,
  external_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (party_kind, party_ref, system_code, external_ref)
);
CREATE INDEX IF NOT EXISTS idx_ssp_ext_id_ref_party ON public.ssp_external_identity_ref(party_kind, party_ref);
CREATE INDEX IF NOT EXISTS idx_ssp_ext_id_ref_system ON public.ssp_external_identity_ref(system_code, external_ref);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_external_identity_ref TO authenticated;
GRANT ALL ON public.ssp_external_identity_ref TO service_role;
GRANT SELECT ON public.ssp_external_identity_ref TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_identity_verification_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_identity_id uuid NOT NULL REFERENCES public.ssp_party_identity(id) ON DELETE CASCADE,
  event_type text NOT NULL,             -- submitted | verified | failed | expired | manually_reviewed | revoked
  status text NOT NULL,                 -- unverified | verified | failed | expired | manually_reviewed
  verified_by uuid,
  verification_source text,             -- portal | staff | external_registry | batch
  evidence_ref text,
  reason text,
  event_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ssp_id_verify_party ON public.ssp_identity_verification_event(party_identity_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_identity_verification_event TO authenticated;
GRANT ALL ON public.ssp_identity_verification_event TO service_role;
GRANT SELECT ON public.ssp_identity_verification_event TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_identity_match_key (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_kind text NOT NULL,
  party_ref text NOT NULL,
  key_type text NOT NULL,               -- name_dob | id_hash | phone | email | address_hash
  key_value text NOT NULL,
  key_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (party_kind, party_ref, key_type, key_value)
);
CREATE INDEX IF NOT EXISTS idx_ssp_id_match_key_lookup ON public.ssp_identity_match_key(key_type, key_value);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_identity_match_key TO authenticated;
GRANT ALL ON public.ssp_identity_match_key TO service_role;
GRANT SELECT ON public.ssp_identity_match_key TO anon;

-- ============================================================
-- app_modules registration (under Administration)
-- ============================================================
INSERT INTO public.app_modules (
  id, name, display_name, description, icon, route, parent_id,
  sort_order, is_enabled, show_in_menu, routes_enabled, actions_enabled
) VALUES (
  '2c2c0000-0000-4000-8000-000000000230'::uuid,
  'identity_domain',
  'Identity',
  'Shared Social Security Identity Domain: identity types, country identity rules, validation patterns, party identities, external references, verification events, match keys.',
  'IdCard',
  '/admin/identity',
  'aab5fcb8-51fb-4a5c-8a87-6cef31068b47'::uuid,
  76,
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
  v_module_id uuid := '2c2c0000-0000-4000-8000-000000000230'::uuid;
  v_action_id uuid;
  r RECORD;
  a RECORD;
BEGIN
  FOR a IN SELECT * FROM (VALUES
      ('view',   'View Identity Domain'),
      ('manage', 'Manage Identity Domain (types, rules, patterns, party identities)'),
      ('admin',  'Administer Identity Domain (governance, lifecycle)'),
      ('import', 'Import Identity reference data'),
      ('export', 'Export Identity reference data'),
      ('verify', 'Verify party identities and record verification events')
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
    FOR a IN SELECT action_name FROM (VALUES ('view'),('manage'),('admin'),('import'),('export'),('verify')) AS t(action_name)
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
-- Enterprise Catalogue registration
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
  'identity_domain',
  'Identity Domain Pack',
  'shared_domain',
  'Social Security Shared Domain',
  'Social Security Shared Domain',
  'active',
  '1.0.0',
  '/admin/identity',
  'identity_domain',
  'identity_domain:view',
  ARRAY['organisation','geography','employer','member','bn','contributions','compliance','legal','finance','hrms','prison','licensing','portals'],
  ARRAY['reference_framework','master_data_platform','geography_domain','organisation_foundation'],
  'docs/social-security/EPIC_2_3_IDENTITY_DOMAIN_PACK_ACCEPTANCE.md',
  'docs/social-security/PHASE_2_SOCIAL_SECURITY_SHARED_DOMAIN_PROGRAMME.md',
  'docs/social-security/EPIC_2_3_IDENTITY_DOMAIN_PACK_ACCEPTANCE.md',
  'green','green','green','green','green','green','green','green',
  'Shared canonical Identity foundation: ID types, country identity rules, validation patterns, party identities, external references, verification events, match keys. Consumes Geography for country linkage.',
  true, 230
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
