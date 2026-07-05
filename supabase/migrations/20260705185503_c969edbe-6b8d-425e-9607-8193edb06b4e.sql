
-- ============================================================
-- Phase 2.4 — Financial Reference Domain Pack (additive)
-- Project rule: no RLS; role-based security only.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ssp_currency_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code text NOT NULL UNIQUE,
  currency_name text NOT NULL,
  numeric_code text,
  symbol text,
  minor_unit integer NOT NULL DEFAULT 2,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_currency_profile TO authenticated;
GRANT ALL ON public.ssp_currency_profile TO service_role;
GRANT SELECT ON public.ssp_currency_profile TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_exchange_rate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  rate numeric(20,10) NOT NULL,
  rate_date date NOT NULL,
  source text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_currency, to_currency, rate_date, source)
);
CREATE INDEX IF NOT EXISTS idx_ssp_fx_lookup ON public.ssp_exchange_rate(from_currency, to_currency, rate_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_exchange_rate TO authenticated;
GRANT ALL ON public.ssp_exchange_rate TO service_role;
GRANT SELECT ON public.ssp_exchange_rate TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_code text NOT NULL UNIQUE,
  bank_name text NOT NULL,
  short_name text,
  country_code text,
  swift_bic text,
  national_code text,
  legacy_ref text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ssp_bank_country ON public.ssp_bank(country_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_bank TO authenticated;
GRANT ALL ON public.ssp_bank TO service_role;
GRANT SELECT ON public.ssp_bank TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_bank_branch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id uuid NOT NULL REFERENCES public.ssp_bank(id) ON DELETE CASCADE,
  branch_code text NOT NULL,
  branch_name text NOT NULL,
  address text,
  city text,
  geo_area_id uuid,
  country_code text,
  routing_number text,
  swift_bic text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bank_id, branch_code)
);
CREATE INDEX IF NOT EXISTS idx_ssp_branch_bank ON public.ssp_bank_branch(bank_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_bank_branch TO authenticated;
GRANT ALL ON public.ssp_bank_branch TO service_role;
GRANT SELECT ON public.ssp_bank_branch TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_payment_channel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_code text NOT NULL,
  channel_name text NOT NULL,
  category text NOT NULL,                     -- cheque | cash | eft | ach | wire | card | wallet | gateway | other
  direction text NOT NULL DEFAULT 'both',     -- inbound | outbound | both
  country_code text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_code, country_code)
);
CREATE INDEX IF NOT EXISTS idx_ssp_channel_country ON public.ssp_payment_channel(country_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_payment_channel TO authenticated;
GRANT ALL ON public.ssp_payment_channel TO service_role;
GRANT SELECT ON public.ssp_payment_channel TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_settlement_method (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  method_code text NOT NULL UNIQUE,
  method_name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_settlement_method TO authenticated;
GRANT ALL ON public.ssp_settlement_method TO service_role;
GRANT SELECT ON public.ssp_settlement_method TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_account_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code text NOT NULL UNIQUE,
  account_name text NOT NULL,
  category text NOT NULL DEFAULT 'bank',       -- bank | wallet | gl | tax | clearing | suspense
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_account_type TO authenticated;
GRANT ALL ON public.ssp_account_type TO service_role;
GRANT SELECT ON public.ssp_account_type TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_tax_reference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  tax_code text NOT NULL,
  tax_name text NOT NULL,
  tax_authority text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, tax_code)
);
CREATE INDEX IF NOT EXISTS idx_ssp_tax_country ON public.ssp_tax_reference(country_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_tax_reference TO authenticated;
GRANT ALL ON public.ssp_tax_reference TO service_role;
GRANT SELECT ON public.ssp_tax_reference TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_chart_of_account_ref (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code text NOT NULL,
  account_name text NOT NULL,
  account_type text,                            -- asset | liability | equity | revenue | expense
  parent_code text,
  country_code text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, account_code)
);
CREATE INDEX IF NOT EXISTS idx_ssp_coa_country ON public.ssp_chart_of_account_ref(country_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_chart_of_account_ref TO authenticated;
GRANT ALL ON public.ssp_chart_of_account_ref TO service_role;
GRANT SELECT ON public.ssp_chart_of_account_ref TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_financial_external_code (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_code text NOT NULL,                    -- legacy_bn | legacy_bema | tb_bank_code | swift | central_bank | etc
  entity_type text NOT NULL,                    -- bank | branch | channel | account | tax | currency
  local_ref text NOT NULL,
  external_code text NOT NULL,
  external_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (system_code, entity_type, external_code)
);
CREATE INDEX IF NOT EXISTS idx_ssp_fin_ext_local ON public.ssp_financial_external_code(entity_type, local_ref);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_financial_external_code TO authenticated;
GRANT ALL ON public.ssp_financial_external_code TO service_role;
GRANT SELECT ON public.ssp_financial_external_code TO anon;

CREATE TABLE IF NOT EXISTS public.ssp_country_financial_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  entity_type text NOT NULL,                    -- currency | bank | channel | settlement | account | tax
  entity_ref text NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  effective_from date,
  effective_to date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, entity_type, entity_ref)
);
CREATE INDEX IF NOT EXISTS idx_ssp_cfa_country ON public.ssp_country_financial_availability(country_code, entity_type);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_country_financial_availability TO authenticated;
GRANT ALL ON public.ssp_country_financial_availability TO service_role;
GRANT SELECT ON public.ssp_country_financial_availability TO anon;

-- ============================================================
-- app_modules registration
-- ============================================================
INSERT INTO public.app_modules (
  id, name, display_name, description, icon, route, parent_id,
  sort_order, is_enabled, show_in_menu, routes_enabled, actions_enabled
) VALUES (
  '2c2c0000-0000-4000-8000-000000000240'::uuid,
  'financial_reference_domain',
  'Financial Reference',
  'Shared Social Security Financial Reference Domain: currencies, exchange rates, banks, bank branches, payment channels, settlement methods, account types, tax references, chart-of-account references, external codes, country availability.',
  'Banknote',
  '/admin/financial-reference',
  'aab5fcb8-51fb-4a5c-8a87-6cef31068b47'::uuid,
  77,
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

-- ============================================================
-- Actions + role grants
-- ============================================================
DO $$
DECLARE
  v_module_id uuid := '2c2c0000-0000-4000-8000-000000000240'::uuid;
  v_action_id uuid;
  r RECORD;
  a RECORD;
BEGIN
  FOR a IN SELECT * FROM (VALUES
      ('view',   'View Financial Reference Domain'),
      ('manage', 'Manage Financial Reference (currencies, banks, channels, settlement, accounts, tax)'),
      ('admin',  'Administer Financial Reference Domain (governance, lifecycle)'),
      ('import', 'Import Financial Reference data'),
      ('export', 'Export Financial Reference data')
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
  'financial_reference_domain',
  'Financial Reference Domain Pack',
  'shared_domain',
  'Social Security Shared Domain',
  'Social Security Shared Domain',
  'active',
  '1.0.0',
  '/admin/financial-reference',
  'financial_reference_domain',
  'financial_reference_domain:view',
  ARRAY['organisation','geography','employer','member','bn','contributions','compliance','legal','finance','payroll','hrms','prison','licensing','portals'],
  ARRAY['reference_framework','master_data_platform','geography_domain','organisation_foundation'],
  'docs/social-security/EPIC_2_4_FINANCIAL_REFERENCE_DOMAIN_PACK_ACCEPTANCE.md',
  'docs/social-security/PHASE_2_SOCIAL_SECURITY_SHARED_DOMAIN_PROGRAMME.md',
  'docs/social-security/EPIC_2_4_FINANCIAL_REFERENCE_DOMAIN_PACK_ACCEPTANCE.md',
  'green','green','green','green','green','green','amber','green',
  'Shared canonical Financial Reference foundation: currencies, FX, banks, branches, payment channels, settlement, account types, tax refs, CoA refs, external codes, country availability. Does not execute payments or post to GL.',
  true, 240
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
