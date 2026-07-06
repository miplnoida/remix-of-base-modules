
CREATE TABLE IF NOT EXISTS public.ssb_implementation_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL UNIQUE,
  organization_name text NOT NULL,
  currency_code text NOT NULL,
  timezone text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text, updated_by text
);
CREATE TABLE IF NOT EXISTS public.ssb_address_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.ssb_implementation_profile(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  admin_level_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  mandatory_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  optional_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  use_parish boolean NOT NULL DEFAULT true,
  use_village boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by text
);
CREATE TABLE IF NOT EXISTS public.ssb_identity_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.ssb_implementation_profile(id) ON DELETE CASCADE,
  identity_type_code text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  is_accepted boolean NOT NULL DEFAULT true,
  validation_pattern text, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by text
);
CREATE TABLE IF NOT EXISTS public.ssb_numbering_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.ssb_implementation_profile(id) ON DELETE CASCADE,
  entity_code text NOT NULL,
  sequence_code text, format_pattern text, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by text,
  UNIQUE (profile_id, entity_code)
);
CREATE TABLE IF NOT EXISTS public.ssb_contribution_calendar_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.ssb_implementation_profile(id) ON DELETE CASCADE,
  fiscal_year_start_month int NOT NULL DEFAULT 1,
  contribution_period text NOT NULL DEFAULT 'monthly',
  filing_due_day int, payment_due_day int, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by text
);
CREATE TABLE IF NOT EXISTS public.ssb_financial_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.ssb_implementation_profile(id) ON DELETE CASCADE,
  binding_kind text NOT NULL,
  reference_code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by text,
  UNIQUE (profile_id, binding_kind, reference_code)
);
CREATE TABLE IF NOT EXISTS public.ssb_legal_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.ssb_implementation_profile(id) ON DELETE CASCADE,
  legal_reference_code text NOT NULL,
  applies_to text, is_active boolean NOT NULL DEFAULT true, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by text,
  UNIQUE (profile_id, legal_reference_code)
);
CREATE TABLE IF NOT EXISTS public.ssb_document_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.ssb_implementation_profile(id) ON DELETE CASCADE,
  document_type_code text NOT NULL,
  applies_to text, is_mandatory boolean NOT NULL DEFAULT false,
  document_profile_code text, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by text
);
CREATE TABLE IF NOT EXISTS public.ssb_communication_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.ssb_implementation_profile(id) ON DELETE CASCADE,
  template_code text NOT NULL, channel text NOT NULL,
  is_active boolean NOT NULL DEFAULT true, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by text,
  UNIQUE (profile_id, template_code, channel)
);
CREATE TABLE IF NOT EXISTS public.ssb_workflow_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.ssb_implementation_profile(id) ON DELETE CASCADE,
  workflow_code text NOT NULL,
  applies_to text, sla_hours int, approval_levels int,
  is_active boolean NOT NULL DEFAULT true, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by text
);
CREATE TABLE IF NOT EXISTS public.ssb_setup_readiness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.ssb_implementation_profile(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  status text NOT NULL DEFAULT 'missing',
  computed_at timestamptz NOT NULL DEFAULT now(),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (profile_id, section_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.ssb_implementation_profile, public.ssb_address_policy, public.ssb_identity_policy,
  public.ssb_numbering_policy, public.ssb_contribution_calendar_policy, public.ssb_financial_policy,
  public.ssb_legal_policy, public.ssb_document_policy, public.ssb_communication_policy,
  public.ssb_workflow_policy, public.ssb_setup_readiness
TO authenticated, anon;
GRANT ALL ON
  public.ssb_implementation_profile, public.ssb_address_policy, public.ssb_identity_policy,
  public.ssb_numbering_policy, public.ssb_contribution_calendar_policy, public.ssb_financial_policy,
  public.ssb_legal_policy, public.ssb_document_policy, public.ssb_communication_policy,
  public.ssb_workflow_policy, public.ssb_setup_readiness
TO service_role;

CREATE OR REPLACE FUNCTION public.ssb_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ssb_implementation_profile','ssb_address_policy','ssb_identity_policy',
    'ssb_numbering_policy','ssb_contribution_calendar_policy','ssb_financial_policy',
    'ssb_legal_policy','ssb_document_policy','ssb_communication_policy','ssb_workflow_policy'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$s;', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.ssb_set_updated_at();', t);
  END LOOP;
END $$;

INSERT INTO public.ssb_implementation_profile (country_code, organization_name, currency_code, timezone, status)
VALUES ('KN', 'Social Security Board / St. Kitts & Nevis', 'XCD', 'America/St_Kitts', 'draft')
ON CONFLICT (country_code) DO NOTHING;

INSERT INTO public.app_modules (id, name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu, actions_enabled, routes_enabled)
VALUES (
  'e2b00000-0000-4000-8000-000000000001',
  'ssb_implementation_setup',
  'SSB Implementation Setup',
  'St. Kitts & Nevis Social Security Board implementation configuration (policy bindings only).',
  'Settings2', '/admin/ssb-setup',
  'aab5fcb8-51fb-4a5c-8a87-6cef31068b47',
  6, true, true, true, true
) ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name, route = EXCLUDED.route,
  parent_id = EXCLUDED.parent_id, is_enabled = true, show_in_menu = true;

INSERT INTO public.enterprise_capability_registry
  (capability_key, capability_name, category, grouping, owner, status, canonical_route, menu_module_name,
   consumers, dependencies, description, is_active, sort_order)
VALUES (
  'ssb_implementation_setup', 'SSB Implementation Setup',
  'implementation_configuration', 'Administration',
  'Social Security Board Configuration', 'active',
  '/admin/ssb-setup', 'ssb_implementation_setup',
  ARRAY['Benefits','Employer','Contributions','Claims','Compliance','Finance'],
  ARRAY['Geography','Identity','Financial','Legal','Participant','Documents','Communication','Workflow','Numbering','Organisation'],
  'One clean shell that configures KN implementation policy and links to existing engine CRUD screens. Stores only bindings/policies, not master data.',
  true, 100
) ON CONFLICT (capability_key) DO UPDATE SET
  canonical_route = EXCLUDED.canonical_route,
  status = 'active', is_active = true, updated_at = now();
