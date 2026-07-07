
-- ============================================================
-- Epic 4: Reference Data Consolidation
-- ============================================================

-- 1) core_reference_source_map
CREATE TABLE IF NOT EXISTS public.core_reference_source_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_category_code text,
  reference_group_code text NOT NULL,
  source_type text NOT NULL,
  source_table_name text,
  source_view_name text,
  source_service_name text,
  table_registry_id uuid REFERENCES public.core_table_registry(id) ON DELETE SET NULL,
  legacy_table_map_id uuid REFERENCES public.core_legacy_table_map(id) ON DELETE SET NULL,
  legacy_table_name text,
  modern_entity_name text,
  admin_route text,
  owner_module_code text NOT NULL DEFAULT 'CORE',
  owner_domain_code text,
  is_primary_source boolean NOT NULL DEFAULT true,
  sync_strategy text NOT NULL DEFAULT 'DIRECT',
  lifecycle_status text NOT NULL DEFAULT 'ACTIVE',
  data_steward_role text,
  data_steward_user_id uuid,
  supports_effective_dates boolean NOT NULL DEFAULT false,
  supports_hierarchy boolean NOT NULL DEFAULT false,
  supports_localization boolean NOT NULL DEFAULT false,
  supports_external_codes boolean NOT NULL DEFAULT false,
  description text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT core_ref_src_map_unique UNIQUE (reference_group_code, source_type, source_table_name),
  CONSTRAINT core_ref_src_map_source_type_ck CHECK (source_type IN
    ('CORE_REFERENCE','LEGACY_TABLE','MODULE_TABLE','VIEW','SERVICE','STATIC_ENUM','EXTERNAL_SYSTEM')),
  CONSTRAINT core_ref_src_map_sync_ck CHECK (sync_strategy IN
    ('DIRECT','VIEW','ADAPTER','SYNC_TO_CORE','SYNC_FROM_CORE','MANUAL','READ_ONLY')),
  CONSTRAINT core_ref_src_map_lifecycle_ck CHECK (lifecycle_status IN
    ('PLANNED','ACTIVE','DEPRECATED','RETIRED','ARCHIVED'))
);
CREATE INDEX IF NOT EXISTS idx_core_ref_src_map_group ON public.core_reference_source_map(reference_group_code);
CREATE INDEX IF NOT EXISTS idx_core_ref_src_map_owner ON public.core_reference_source_map(owner_module_code);
CREATE INDEX IF NOT EXISTS idx_core_ref_src_map_lifecycle ON public.core_reference_source_map(lifecycle_status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_reference_source_map TO authenticated;
GRANT SELECT ON public.core_reference_source_map TO anon;
GRANT ALL ON public.core_reference_source_map TO service_role;

CREATE TRIGGER trg_core_ref_src_map_updated
BEFORE UPDATE ON public.core_reference_source_map
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) core_reference_consumer_map
CREATE TABLE IF NOT EXISTS public.core_reference_consumer_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_group_code text NOT NULL,
  consumer_module_code text NOT NULL,
  consumer_domain_code text,
  consumer_feature text,
  consumer_route text,
  consumer_service text,
  usage_type text NOT NULL DEFAULT 'LOOKUP',
  is_required boolean NOT NULL DEFAULT false,
  can_cache boolean NOT NULL DEFAULT true,
  impact_level text NOT NULL DEFAULT 'MEDIUM',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT core_ref_cons_map_unique UNIQUE (reference_group_code, consumer_module_code, consumer_feature),
  CONSTRAINT core_ref_cons_map_usage_ck CHECK (usage_type IN
    ('LOOKUP','VALIDATION','WORKFLOW','REPORTING','CALCULATION','SECURITY','NOTIFICATION','DOCUMENT','SEARCH_FILTER')),
  CONSTRAINT core_ref_cons_map_impact_ck CHECK (impact_level IN ('LOW','MEDIUM','HIGH','CRITICAL'))
);
CREATE INDEX IF NOT EXISTS idx_core_ref_cons_map_group ON public.core_reference_consumer_map(reference_group_code);
CREATE INDEX IF NOT EXISTS idx_core_ref_cons_map_module ON public.core_reference_consumer_map(consumer_module_code);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_reference_consumer_map TO authenticated;
GRANT SELECT ON public.core_reference_consumer_map TO anon;
GRANT ALL ON public.core_reference_consumer_map TO service_role;

CREATE TRIGGER trg_core_ref_cons_map_updated
BEFORE UPDATE ON public.core_reference_consumer_map
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) core_reference_dependency_map
CREATE TABLE IF NOT EXISTS public.core_reference_dependency_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_reference_group_code text NOT NULL,
  depends_on_reference_group_code text NOT NULL,
  dependency_type text NOT NULL,
  dependency_rule text,
  is_required boolean NOT NULL DEFAULT false,
  impact_level text NOT NULL DEFAULT 'MEDIUM',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT core_ref_dep_map_unique UNIQUE (source_reference_group_code, depends_on_reference_group_code, dependency_type),
  CONSTRAINT core_ref_dep_map_type_ck CHECK (dependency_type IN
    ('PARENT_CHILD','FILTERED_BY','VALIDATED_BY','DERIVED_FROM','REQUIRES','EXCLUDES','CASCADE')),
  CONSTRAINT core_ref_dep_map_impact_ck CHECK (impact_level IN ('LOW','MEDIUM','HIGH','CRITICAL'))
);
CREATE INDEX IF NOT EXISTS idx_core_ref_dep_map_source ON public.core_reference_dependency_map(source_reference_group_code);
CREATE INDEX IF NOT EXISTS idx_core_ref_dep_map_target ON public.core_reference_dependency_map(depends_on_reference_group_code);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_reference_dependency_map TO authenticated;
GRANT SELECT ON public.core_reference_dependency_map TO anon;
GRANT ALL ON public.core_reference_dependency_map TO service_role;

CREATE TRIGGER trg_core_ref_dep_map_updated
BEFORE UPDATE ON public.core_reference_dependency_map
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) core_reference_change_policy
CREATE TABLE IF NOT EXISTS public.core_reference_change_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_group_code text NOT NULL UNIQUE,
  allow_create boolean NOT NULL DEFAULT true,
  allow_update boolean NOT NULL DEFAULT true,
  allow_delete boolean NOT NULL DEFAULT false,
  allow_retire boolean NOT NULL DEFAULT true,
  requires_approval boolean NOT NULL DEFAULT false,
  approval_permission text,
  block_delete_if_consumed boolean NOT NULL DEFAULT true,
  block_retire_if_active_records boolean NOT NULL DEFAULT true,
  effective_date_required boolean NOT NULL DEFAULT false,
  reason_required boolean NOT NULL DEFAULT true,
  policy_notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_reference_change_policy TO authenticated;
GRANT SELECT ON public.core_reference_change_policy TO anon;
GRANT ALL ON public.core_reference_change_policy TO service_role;

CREATE TRIGGER trg_core_ref_change_policy_updated
BEFORE UPDATE ON public.core_reference_change_policy
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Register new tables in core_table_registry
-- ============================================================
INSERT INTO public.core_table_registry
  (table_name, table_prefix, modern_alias, domain_code, module_code, table_category, ownership_type,
   is_legacy_table, canonical_admin_route, data_classification, lifecycle_status, description)
VALUES
  ('core_reference_source_map','core_','Reference Source Map','GOVERNANCE','CORE','CONFIGURATION','PLATFORM',
   false,'/admin/reference-framework','INTERNAL','ACTIVE','Maps reference groups to their physical source (table/view/service).'),
  ('core_reference_consumer_map','core_','Reference Consumer Map','GOVERNANCE','CORE','CONFIGURATION','PLATFORM',
   false,'/admin/reference-framework','INTERNAL','ACTIVE','Records which modules consume which reference groups.'),
  ('core_reference_dependency_map','core_','Reference Dependency Map','GOVERNANCE','CORE','CONFIGURATION','PLATFORM',
   false,'/admin/reference-framework','INTERNAL','ACTIVE','Records dependencies between reference groups.'),
  ('core_reference_change_policy','core_','Reference Change Policy','GOVERNANCE','CORE','CONFIGURATION','PLATFORM',
   false,'/admin/reference-framework','INTERNAL','ACTIVE','Controls whether reference data may be changed, retired, or deleted.')
ON CONFLICT (table_name) DO UPDATE SET
  modern_alias = EXCLUDED.modern_alias,
  domain_code = EXCLUDED.domain_code,
  module_code = EXCLUDED.module_code,
  table_category = EXCLUDED.table_category,
  ownership_type = EXCLUDED.ownership_type,
  canonical_admin_route = EXCLUDED.canonical_admin_route,
  description = EXCLUDED.description,
  updated_at = now();

-- ============================================================
-- Seed initial reference source mappings
-- ============================================================
INSERT INTO public.core_reference_source_map
  (reference_group_code, source_type, source_table_name, legacy_table_name, modern_entity_name,
   admin_route, owner_module_code, owner_domain_code, sync_strategy, lifecycle_status,
   supports_hierarchy, supports_external_codes, description)
VALUES
  ('OFFICE','LEGACY_TABLE','tb_office','tb_office','Office','/admin/offices','CORE','ORGANISATION','DIRECT','ACTIVE',false,true,'SSB offices master.'),
  ('DEPARTMENT','LEGACY_TABLE','tb_office_departments','tb_office_departments','Department','/admin/departments','CORE','ORGANISATION','DIRECT','ACTIVE',true,false,'Office departments master.'),
  ('DESIGNATION','LEGACY_TABLE','tb_designations','tb_designations','Designation','/admin/designations','CORE','ORGANISATION','DIRECT','ACTIVE',true,false,'Staff designations.'),
  ('COUNTRY','CORE_REFERENCE','core_reference_value',NULL,'Country','/admin/master-data','CORE','GEOGRAPHY','DIRECT','ACTIVE',false,true,'Country master.'),
  ('DISTRICT','CORE_REFERENCE','core_reference_value',NULL,'District','/admin/master-data','CORE','GEOGRAPHY','DIRECT','ACTIVE',true,false,'District/parish master.'),
  ('POSTAL_DISTRICT','CORE_REFERENCE','core_reference_value',NULL,'Postal District','/admin/master-data','CORE','GEOGRAPHY','DIRECT','ACTIVE',false,false,'Postal district master.'),
  ('MARITAL_STATUS','CORE_REFERENCE','core_reference_value',NULL,'Marital Status','/admin/master-data','CORE','PARTICIPANT','DIRECT','ACTIVE',false,false,'Marital status codes.'),
  ('OCCUPATION','CORE_REFERENCE','core_reference_value',NULL,'Occupation','/admin/master-data','CORE','PARTICIPANT','DIRECT','ACTIVE',true,true,'Occupation codes.'),
  ('INDUSTRY','CORE_REFERENCE','core_reference_value',NULL,'Industry','/admin/master-data','CORE','EMPLOYER','DIRECT','ACTIVE',true,true,'Industry classification codes.'),
  ('BANK_CODE','LEGACY_TABLE','tb_bank_code','tb_bank_code','Bank','/admin/master-data','CORE','FINANCIAL','DIRECT','ACTIVE',false,true,'Bank code master.'),
  ('PAYMENT_METHOD','CORE_REFERENCE','core_reference_value',NULL,'Payment Method','/admin/master-data','CORE','FINANCIAL','DIRECT','ACTIVE',false,false,'Payment method codes.'),
  ('PAY_PERIOD','CORE_REFERENCE','core_reference_value',NULL,'Pay Period','/admin/master-data','CORE','FINANCIAL','DIRECT','ACTIVE',false,false,'Pay period codes.'),
  ('PAYER_TYPE','CORE_REFERENCE','core_reference_value',NULL,'Payer Type','/admin/master-data','CORE','FINANCIAL','DIRECT','ACTIVE',false,false,'Payer type codes.'),
  ('PAYMENT_TYPE','CORE_REFERENCE','core_reference_value',NULL,'Payment Type','/admin/master-data','CORE','FINANCIAL','DIRECT','ACTIVE',false,false,'Payment type codes.'),
  ('RECEIPT_STATUS','CORE_REFERENCE','core_reference_value',NULL,'Receipt Status','/admin/master-data','CORE','FINANCIAL','DIRECT','ACTIVE',false,false,'Receipt status codes.'),
  ('INVOICE_STATUS','CORE_REFERENCE','core_reference_value',NULL,'Invoice Status','/admin/master-data','CORE','FINANCIAL','DIRECT','ACTIVE',false,false,'Invoice status codes.'),
  ('C3_STATUS','CORE_REFERENCE','core_reference_value',NULL,'C3 Status','/admin/master-data','C3','CONTRIBUTION','DIRECT','ACTIVE',false,false,'C3 submission status.'),
  ('LEGAL_STATUS','CORE_REFERENCE','core_reference_value',NULL,'Legal Status','/admin/master-data','LEGAL','LEGAL','DIRECT','ACTIVE',false,false,'Legal case status codes.'),
  ('DEPENDENT_RELATION','CORE_REFERENCE','core_reference_value',NULL,'Dependent Relation','/admin/master-data','CORE','PARTICIPANT','DIRECT','ACTIVE',false,false,'Dependent relation codes.'),
  ('RELATION','CORE_REFERENCE','core_reference_value',NULL,'Relation','/admin/master-data','CORE','PARTICIPANT','DIRECT','ACTIVE',false,false,'General relation codes.'),
  ('SSC_RATE','MODULE_TABLE',NULL,NULL,'Social Security Contribution Rate','/admin/master-data','CORE','FINANCIAL','MANUAL','ACTIVE',false,false,'SSC contribution rates.'),
  ('VC_CONTRIB_RATE','MODULE_TABLE',NULL,NULL,'Voluntary Contribution Rate','/admin/master-data','CORE','FINANCIAL','MANUAL','ACTIVE',false,false,'Voluntary contributor rates.'),
  ('VC_ELIGIBILITY_CONFIG','MODULE_TABLE',NULL,NULL,'Voluntary Contribution Eligibility','/admin/master-data','CORE','PARTICIPANT','MANUAL','ACTIVE',false,false,'Voluntary contributor eligibility config.'),
  ('VERIFY_STATUS','CORE_REFERENCE','core_reference_value',NULL,'Verify Status','/admin/master-data','CORE','GOVERNANCE','DIRECT','ACTIVE',false,false,'Verification status codes.')
ON CONFLICT (reference_group_code, source_type, source_table_name) DO NOTHING;

-- Backfill table_registry_id where possible
UPDATE public.core_reference_source_map srcmap
   SET table_registry_id = reg.id
  FROM public.core_table_registry reg
 WHERE srcmap.table_registry_id IS NULL
   AND srcmap.source_table_name IS NOT NULL
   AND reg.table_name = srcmap.source_table_name;

-- Backfill legacy_table_map_id where possible
UPDATE public.core_reference_source_map srcmap
   SET legacy_table_map_id = lm.id
  FROM public.core_legacy_table_map lm
 WHERE srcmap.legacy_table_map_id IS NULL
   AND srcmap.legacy_table_name IS NOT NULL
   AND lm.legacy_table_name = srcmap.legacy_table_name;

-- Seed default change policies for those groups
INSERT INTO public.core_reference_change_policy
  (reference_group_code, allow_create, allow_update, allow_delete, allow_retire,
   requires_approval, block_delete_if_consumed, block_retire_if_active_records,
   effective_date_required, reason_required, policy_notes)
SELECT DISTINCT reference_group_code, true, true, false, true,
       false, true, true, false, true,
       'Default policy seeded by Epic 4. Tighten as needed.'
  FROM public.core_reference_source_map
ON CONFLICT (reference_group_code) DO NOTHING;
