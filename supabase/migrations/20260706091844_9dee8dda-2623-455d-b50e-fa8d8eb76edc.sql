
-- =============================================================
-- SSB Configuration Governance v1.0 — additive schema
-- Project standard: NO RLS (see docs/ARCHITECTURE-NO-RLS-RULE.md).
-- =============================================================

-- 1. Configuration Asset Registry
CREATE TABLE IF NOT EXISTS public.ssb_configuration_asset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_key TEXT NOT NULL UNIQUE,
  asset_name TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  lifecycle_stage TEXT NOT NULL DEFAULT 'active',
  engine_owner TEXT,
  implementation_owner TEXT,
  canonical_route TEXT,
  canonical_table TEXT,
  canonical_service TEXT,
  policy_table TEXT,
  scope_type TEXT DEFAULT 'country',
  scope_value TEXT DEFAULT 'KN',
  required_for_benefits BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  health_status TEXT NOT NULL DEFAULT 'unknown',
  documentation_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssb_configuration_asset TO authenticated;
GRANT ALL ON public.ssb_configuration_asset TO service_role;

-- 2. Dependencies
CREATE TABLE IF NOT EXISTS public.ssb_configuration_dependency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_asset_key TEXT NOT NULL,
  target_asset_key TEXT NOT NULL,
  dependency_type TEXT NOT NULL,
  impact_level TEXT NOT NULL DEFAULT 'medium',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_asset_key, target_asset_key, dependency_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssb_configuration_dependency TO authenticated;
GRANT ALL ON public.ssb_configuration_dependency TO service_role;

-- 3. Packages
CREATE TABLE IF NOT EXISTS public.ssb_configuration_package (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_key TEXT NOT NULL UNIQUE,
  package_name TEXT NOT NULL,
  version_no INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  effective_from DATE,
  effective_to DATE,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssb_configuration_package TO authenticated;
GRANT ALL ON public.ssb_configuration_package TO service_role;

-- 4. Package items
CREATE TABLE IF NOT EXISTS public.ssb_configuration_package_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.ssb_configuration_package(id) ON DELETE CASCADE,
  asset_key TEXT NOT NULL,
  policy_table TEXT,
  policy_id UUID,
  policy_version_no INTEGER,
  inclusion_status TEXT NOT NULL DEFAULT 'included',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssb_configuration_package_item TO authenticated;
GRANT ALL ON public.ssb_configuration_package_item TO service_role;

-- 5. Validation runs
CREATE TABLE IF NOT EXISTS public.ssb_configuration_validation_run (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES public.ssb_configuration_package(id) ON DELETE SET NULL,
  run_status TEXT NOT NULL DEFAULT 'completed',
  score INTEGER NOT NULL DEFAULT 0,
  errors_count INTEGER NOT NULL DEFAULT 0,
  warnings_count INTEGER NOT NULL DEFAULT 0,
  info_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  run_by UUID
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssb_configuration_validation_run TO authenticated;
GRANT ALL ON public.ssb_configuration_validation_run TO service_role;

-- 6. Validation results
CREATE TABLE IF NOT EXISTS public.ssb_configuration_validation_result (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_run_id UUID NOT NULL REFERENCES public.ssb_configuration_validation_run(id) ON DELETE CASCADE,
  asset_key TEXT,
  severity TEXT NOT NULL,
  rule_code TEXT NOT NULL,
  message TEXT NOT NULL,
  recommendation TEXT,
  blocking BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssb_configuration_validation_result TO authenticated;
GRANT ALL ON public.ssb_configuration_validation_result TO service_role;

-- 7. Snapshots
CREATE TABLE IF NOT EXISTS public.ssb_configuration_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_key TEXT NOT NULL UNIQUE,
  package_id UUID REFERENCES public.ssb_configuration_package(id) ON DELETE SET NULL,
  snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssb_configuration_snapshot TO authenticated;
GRANT ALL ON public.ssb_configuration_snapshot TO service_role;

-- ---------------------------------------------
-- Seed initial SSB configuration asset registry
-- ---------------------------------------------
INSERT INTO public.ssb_configuration_asset
  (asset_key, asset_name, asset_type, engine_owner, implementation_owner,
   canonical_route, canonical_table, canonical_service, policy_table,
   scope_type, scope_value, required_for_benefits, status, health_status)
VALUES
  ('ssb.general',       'General / Organisation',    'profile',  'Organisation Engine',     'SSB Implementation', '/admin/organization',                  'core_organization',      'organizationService',       'ssb_implementation_profile',        'country','KN', true,  'active','unknown'),
  ('ssb.address',       'Address & Geography',       'policy',   'Geography Engine',        'SSB Implementation', '/admin/master-data/countries',         'ssp_country_profile',    'geographyService',          'ssb_address_policy',                'country','KN', true,  'active','unknown'),
  ('ssb.identity',      'Identity / NIS',            'policy',   'Identity Engine',         'SSB Implementation', '/admin/master-data/identity-types',    'ssp_identity_type',      'identityService',           'ssb_identity_policy',               'country','KN', true,  'active','unknown'),
  ('ssb.numbering',     'Numbering',                 'policy',   'Numbering Engine',        'SSB Implementation', '/admin/numbering',                     'core_number_sequence',   'numberingService',          'ssb_numbering_policy',              'country','KN', true,  'active','unknown'),
  ('ssb.contribution_calendar','Contribution Calendar','policy','Contribution Engine',     'SSB Implementation', '/admin/master-data/remittance-schedule','remittance_schedule',   'contributionCalendarService','ssb_contribution_calendar_policy', 'country','KN', true,  'active','unknown'),
  ('ssb.financial',     'Financial / Payment',       'policy',   'Financial Engine',        'SSB Implementation', '/admin/master-data/banks',             'ssp_bank',               'financialService',          'ssb_financial_policy',              'country','KN', true,  'active','unknown'),
  ('ssb.legal',         'Legal',                     'policy',   'Legal Reference Engine',  'SSB Implementation', '/admin/legal-references',              'ssp_legal_act',          'legalReferenceService',     'ssb_legal_policy',                  'country','KN', true,  'active','unknown'),
  ('ssb.documents',     'Documents',                 'policy',   'DMS Engine',              'SSB Implementation', '/admin/dms/document-types',            'core_dms_document_type', 'dmsService',                'ssb_document_policy',               'country','KN', true,  'active','unknown'),
  ('ssb.communication', 'Communication',             'policy',   'Communication Engine',    'SSB Implementation', '/admin/templates',                     'core_template',          'templateService',           'ssb_communication_policy',          'country','KN', false, 'active','unknown'),
  ('ssb.workflow',      'Workflow / SLA',            'policy',   'Workflow Engine',         'SSB Implementation', '/admin/workflow',                      'core_workbasket',        'workflowService',           'ssb_workflow_policy',               'country','KN', false, 'active','unknown'),
  ('bn.product_builder','BN Product Builder',        'consumer', 'Benefits Engine',         'BN',                 '/admin/bn/product-builder',            'bn_product',             'bnProductService',          NULL,                                 'country','KN', false, 'on_hold','unknown')
ON CONFLICT (asset_key) DO NOTHING;

-- Seed dependencies (BN Product Builder consumes required SSB assets)
INSERT INTO public.ssb_configuration_dependency (source_asset_key, target_asset_key, dependency_type, impact_level)
VALUES
  ('bn.product_builder','ssb.general','consumes','critical'),
  ('bn.product_builder','ssb.address','consumes','high'),
  ('bn.product_builder','ssb.identity','consumes','critical'),
  ('bn.product_builder','ssb.numbering','consumes','high'),
  ('bn.product_builder','ssb.contribution_calendar','consumes','critical'),
  ('bn.product_builder','ssb.financial','consumes','high'),
  ('bn.product_builder','ssb.legal','consumes','high'),
  ('bn.product_builder','ssb.documents','consumes','medium'),
  ('bn.product_builder','ssb.communication','references','low'),
  ('bn.product_builder','ssb.workflow','references','medium')
ON CONFLICT (source_asset_key, target_asset_key, dependency_type) DO NOTHING;

-- ---------------------------------------------
-- Register menu module (idempotent)
-- ---------------------------------------------
INSERT INTO public.app_modules
  (id, name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu)
VALUES
  ('e3000000-0000-4000-8000-000000000030',
   'configuration_governance',
   'Configuration Governance',
   'Registry, dependencies, packages, validation and snapshots for SSB configuration.',
   'ShieldCheck',
   '/admin/configuration-governance',
   'e3000000-0000-4000-8000-000000000001',
   30, true, true)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  route        = EXCLUDED.route,
  parent_id    = EXCLUDED.parent_id,
  sort_order   = EXCLUDED.sort_order,
  is_enabled   = true,
  show_in_menu = true,
  updated_at   = now();

-- Register capability in Enterprise Catalogue
INSERT INTO public.enterprise_capability_registry
  (capability_key, capability_name, category, grouping, owner, status, version,
   canonical_route, menu_module_name, consumers, dependencies, description, is_active, sort_order)
VALUES
  ('configuration_governance',
   'SSB Configuration Governance',
   'configuration_governance',
   'Setup Centre',
   'Social Security Board Configuration',
   'active',
   '1.0',
   '/admin/configuration-governance',
   'configuration_governance',
   ARRAY['Configuration Centre','SSB Implementation Setup','BN Product Builder','Employer','Contributions','Claims','Compliance','Finance'],
   ARRAY['SSB Implementation Setup','Policy Lifecycle','Enterprise Catalogue','Shared Domains','Platform Numbering','Workflow','Documents','Notifications'],
   'Dependency-aware registry, package lifecycle, validation and snapshot layer for St. Kitts SSB configuration.',
   true, 30)
ON CONFLICT (capability_key) DO UPDATE SET
  capability_name = EXCLUDED.capability_name,
  canonical_route = EXCLUDED.canonical_route,
  consumers       = EXCLUDED.consumers,
  dependencies    = EXCLUDED.dependencies,
  description     = EXCLUDED.description,
  updated_at      = now();

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.ssb_config_gov_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_ssb_configuration_asset_touch ON public.ssb_configuration_asset;
CREATE TRIGGER trg_ssb_configuration_asset_touch BEFORE UPDATE ON public.ssb_configuration_asset
  FOR EACH ROW EXECUTE FUNCTION public.ssb_config_gov_touch_updated_at();

DROP TRIGGER IF EXISTS trg_ssb_configuration_package_touch ON public.ssb_configuration_package;
CREATE TRIGGER trg_ssb_configuration_package_touch BEFORE UPDATE ON public.ssb_configuration_package
  FOR EACH ROW EXECUTE FUNCTION public.ssb_config_gov_touch_updated_at();
