
-- 1. core_legacy_table_map
CREATE TABLE IF NOT EXISTS public.core_legacy_table_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_registry_id uuid REFERENCES public.core_table_registry(id) ON DELETE SET NULL,
  legacy_schema_name text NOT NULL DEFAULT 'public',
  legacy_table_name text NOT NULL,
  modern_table_name text,
  modern_entity_name text NOT NULL,
  modern_alias text,
  module_code text NOT NULL DEFAULT 'CORE',
  domain_code text NOT NULL,
  table_category text NOT NULL,
  use_strategy text NOT NULL,
  mapping_status text NOT NULL DEFAULT 'DISCOVERED',
  canonical_view_name text,
  canonical_service_name text,
  canonical_admin_route text,
  is_master_table boolean NOT NULL DEFAULT false,
  is_transaction_table boolean NOT NULL DEFAULT false,
  is_reference_table boolean NOT NULL DEFAULT false,
  is_security_table boolean NOT NULL DEFAULT false,
  is_read_only boolean NOT NULL DEFAULT false,
  contains_pii boolean NOT NULL DEFAULT false,
  contains_financial_data boolean NOT NULL DEFAULT false,
  contains_health_data boolean NOT NULL DEFAULT false,
  legacy_primary_key text,
  modern_primary_key text,
  source_system text DEFAULT 'POWERBUILDER',
  description text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (legacy_schema_name, legacy_table_name),
  CONSTRAINT core_legacy_table_map_strategy_chk CHECK (use_strategy IN ('DIRECT','VIEW','ADAPTER','MIGRATE','ARCHIVE','IGNORE')),
  CONSTRAINT core_legacy_table_map_status_chk CHECK (mapping_status IN ('DISCOVERED','MAPPED','REVIEWED','APPROVED','DEPRECATED','RETIRED'))
);
CREATE INDEX IF NOT EXISTS idx_core_legacy_table_map_domain ON public.core_legacy_table_map(domain_code);
CREATE INDEX IF NOT EXISTS idx_core_legacy_table_map_module ON public.core_legacy_table_map(module_code);
CREATE INDEX IF NOT EXISTS idx_core_legacy_table_map_status ON public.core_legacy_table_map(mapping_status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_legacy_table_map TO authenticated;
GRANT SELECT ON public.core_legacy_table_map TO anon;
GRANT ALL ON public.core_legacy_table_map TO service_role;

-- 2. core_legacy_column_map
CREATE TABLE IF NOT EXISTS public.core_legacy_column_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_map_id uuid NOT NULL REFERENCES public.core_legacy_table_map(id) ON DELETE CASCADE,
  legacy_column_name text NOT NULL,
  modern_field_name text NOT NULL,
  legacy_data_type text,
  modern_data_type text,
  legacy_nullable boolean,
  modern_required boolean NOT NULL DEFAULT false,
  is_primary_key boolean NOT NULL DEFAULT false,
  is_foreign_key boolean NOT NULL DEFAULT false,
  referenced_legacy_table text,
  referenced_legacy_column text,
  is_pii boolean NOT NULL DEFAULT false,
  pii_classification text,
  contains_financial_data boolean NOT NULL DEFAULT false,
  contains_health_data boolean NOT NULL DEFAULT false,
  transformation_rule text,
  validation_rule text,
  default_value text,
  display_label text,
  help_text text,
  mapping_status text NOT NULL DEFAULT 'DISCOVERED',
  sort_order integer DEFAULT 100,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (table_map_id, legacy_column_name),
  CONSTRAINT core_legacy_column_map_status_chk CHECK (mapping_status IN ('DISCOVERED','MAPPED','REVIEWED','APPROVED','DEPRECATED','RETIRED')),
  CONSTRAINT core_legacy_column_map_pii_class_chk CHECK (pii_classification IS NULL OR pii_classification IN ('NONE','PERSONAL','SENSITIVE','FINANCIAL','HEALTH','IDENTIFIER','CONTACT'))
);
CREATE INDEX IF NOT EXISTS idx_core_legacy_column_map_table ON public.core_legacy_column_map(table_map_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_legacy_column_map TO authenticated;
GRANT SELECT ON public.core_legacy_column_map TO anon;
GRANT ALL ON public.core_legacy_column_map TO service_role;

-- 3. core_legacy_value_map
CREATE TABLE IF NOT EXISTS public.core_legacy_value_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_map_id uuid NOT NULL REFERENCES public.core_legacy_table_map(id) ON DELETE CASCADE,
  column_map_id uuid REFERENCES public.core_legacy_column_map(id) ON DELETE CASCADE,
  legacy_code text NOT NULL,
  legacy_label text,
  legacy_description text,
  modern_code text NOT NULL,
  modern_label text NOT NULL,
  modern_description text,
  reference_group_code text,
  reference_value_id uuid,
  mapping_status text NOT NULL DEFAULT 'MAPPED',
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  effective_from date,
  effective_to date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (table_map_id, column_map_id, legacy_code),
  CONSTRAINT core_legacy_value_map_status_chk CHECK (mapping_status IN ('DISCOVERED','MAPPED','REVIEWED','APPROVED','DEPRECATED','RETIRED'))
);
CREATE INDEX IF NOT EXISTS idx_core_legacy_value_map_table ON public.core_legacy_value_map(table_map_id);
CREATE INDEX IF NOT EXISTS idx_core_legacy_value_map_column ON public.core_legacy_value_map(column_map_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_legacy_value_map TO authenticated;
GRANT SELECT ON public.core_legacy_value_map TO anon;
GRANT ALL ON public.core_legacy_value_map TO service_role;

-- 4. core_legacy_relationship_map
CREATE TABLE IF NOT EXISTS public.core_legacy_relationship_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table_map_id uuid NOT NULL REFERENCES public.core_legacy_table_map(id) ON DELETE CASCADE,
  target_table_map_id uuid REFERENCES public.core_legacy_table_map(id) ON DELETE SET NULL,
  relationship_name text NOT NULL,
  source_legacy_column text NOT NULL,
  target_legacy_table text NOT NULL,
  target_legacy_column text NOT NULL,
  modern_relationship_name text,
  relationship_type text NOT NULL,
  is_enforced_in_legacy boolean NOT NULL DEFAULT false,
  is_required boolean NOT NULL DEFAULT false,
  mapping_status text NOT NULL DEFAULT 'DISCOVERED',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT core_legacy_relationship_map_type_chk CHECK (relationship_type IN ('ONE_TO_ONE','ONE_TO_MANY','MANY_TO_ONE','MANY_TO_MANY','LOOKUP','REFERENCE','PARENT_CHILD')),
  CONSTRAINT core_legacy_relationship_map_status_chk CHECK (mapping_status IN ('DISCOVERED','MAPPED','REVIEWED','APPROVED','DEPRECATED','RETIRED'))
);
CREATE INDEX IF NOT EXISTS idx_core_legacy_relationship_map_source ON public.core_legacy_relationship_map(source_table_map_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_legacy_relationship_map TO authenticated;
GRANT SELECT ON public.core_legacy_relationship_map TO anon;
GRANT ALL ON public.core_legacy_relationship_map TO service_role;

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.core_legacy_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_core_legacy_table_map_touch BEFORE UPDATE ON public.core_legacy_table_map
  FOR EACH ROW EXECUTE FUNCTION public.core_legacy_touch_updated_at();
CREATE TRIGGER trg_core_legacy_column_map_touch BEFORE UPDATE ON public.core_legacy_column_map
  FOR EACH ROW EXECUTE FUNCTION public.core_legacy_touch_updated_at();
CREATE TRIGGER trg_core_legacy_value_map_touch BEFORE UPDATE ON public.core_legacy_value_map
  FOR EACH ROW EXECUTE FUNCTION public.core_legacy_touch_updated_at();
CREATE TRIGGER trg_core_legacy_relationship_map_touch BEFORE UPDATE ON public.core_legacy_relationship_map
  FOR EACH ROW EXECUTE FUNCTION public.core_legacy_touch_updated_at();
