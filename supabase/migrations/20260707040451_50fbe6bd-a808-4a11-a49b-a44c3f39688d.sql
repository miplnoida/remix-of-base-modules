
CREATE TABLE public.core_table_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL UNIQUE,
  table_prefix text,
  modern_alias text,
  domain_code text NOT NULL,
  module_code text,
  table_category text NOT NULL,
  ownership_type text NOT NULL,
  is_legacy_table boolean NOT NULL DEFAULT false,
  legacy_schema_name text,
  legacy_table_name text,
  canonical_service text,
  canonical_admin_route text,
  data_classification text NOT NULL DEFAULT 'INTERNAL',
  contains_pii boolean NOT NULL DEFAULT false,
  contains_financial_data boolean NOT NULL DEFAULT false,
  contains_health_data boolean NOT NULL DEFAULT false,
  lifecycle_status text NOT NULL DEFAULT 'ACTIVE',
  description text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT core_table_registry_ownership_chk CHECK (ownership_type IN ('PLATFORM','MODULE','LEGACY','MIGRATION','REPORTING','ARCHIVE')),
  CONSTRAINT core_table_registry_category_chk CHECK (table_category IN ('MASTER','REFERENCE','TRANSACTION','CONFIGURATION','SECURITY','AUDIT','WORKFLOW','DOCUMENT','NOTIFICATION','MIGRATION','REPORTING','LOOKUP','JUNCTION','ARCHIVE','OTHER')),
  CONSTRAINT core_table_registry_lifecycle_chk CHECK (lifecycle_status IN ('PLANNED','ACTIVE','DEPRECATED','RETIRED','ARCHIVED')),
  CONSTRAINT core_table_registry_classification_chk CHECK (data_classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED','SENSITIVE')),
  CONSTRAINT core_table_registry_legacy_alias_chk CHECK (is_legacy_table = false OR (modern_alias IS NOT NULL AND legacy_table_name IS NOT NULL)),
  CONSTRAINT core_table_registry_module_required_chk CHECK (ownership_type <> 'MODULE' OR module_code IS NOT NULL),
  CONSTRAINT core_table_registry_pii_classification_chk CHECK (contains_pii = false OR data_classification IN ('CONFIDENTIAL','RESTRICTED','SENSITIVE')),
  CONSTRAINT core_table_registry_health_classification_chk CHECK (contains_health_data = false OR data_classification IN ('RESTRICTED','SENSITIVE'))
);

CREATE INDEX idx_core_table_registry_prefix ON public.core_table_registry(table_prefix);
CREATE INDEX idx_core_table_registry_domain ON public.core_table_registry(domain_code);
CREATE INDEX idx_core_table_registry_module ON public.core_table_registry(module_code);
CREATE INDEX idx_core_table_registry_ownership ON public.core_table_registry(ownership_type);
CREATE INDEX idx_core_table_registry_lifecycle ON public.core_table_registry(lifecycle_status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_table_registry TO authenticated;
GRANT SELECT ON public.core_table_registry TO anon;
GRANT ALL ON public.core_table_registry TO service_role;

-- Naming validation trigger: enforce prefix -> module_code / ownership_type rules
CREATE OR REPLACE FUNCTION public.core_table_registry_validate_naming()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  n text := lower(coalesce(NEW.table_name,''));
BEGIN
  IF NEW.table_prefix IS NULL OR NEW.table_prefix = '' THEN
    IF position('_' IN n) > 0 THEN
      NEW.table_prefix := split_part(n,'_',1) || '_';
    ELSE
      NEW.table_prefix := 'none';
    END IF;
  END IF;

  IF n LIKE 'core\_%' ESCAPE '\' AND NEW.ownership_type <> 'PLATFORM' THEN
    RAISE EXCEPTION 'core_ tables must have ownership_type = PLATFORM (got %)', NEW.ownership_type;
  END IF;
  IF n LIKE 'bn\_%' ESCAPE '\' AND coalesce(NEW.module_code,'') <> 'BN' THEN
    RAISE EXCEPTION 'bn_ tables must have module_code = BN';
  END IF;
  IF n LIKE 'er\_%' ESCAPE '\' AND coalesce(NEW.module_code,'') <> 'ER' THEN
    RAISE EXCEPTION 'er_ tables must have module_code = ER';
  END IF;
  IF n LIKE 'ip\_%' ESCAPE '\' AND coalesce(NEW.module_code,'') <> 'IP' THEN
    RAISE EXCEPTION 'ip_ tables must have module_code = IP';
  END IF;
  IF n LIKE 'c3\_%' ESCAPE '\' AND coalesce(NEW.module_code,'') <> 'C3' THEN
    RAISE EXCEPTION 'c3_ tables must have module_code = C3';
  END IF;
  IF n LIKE 'ce\_%' ESCAPE '\' AND coalesce(NEW.module_code,'') <> 'CE' THEN
    RAISE EXCEPTION 'ce_ tables must have module_code = CE';
  END IF;
  IF n LIKE 'fin\_%' ESCAPE '\' AND coalesce(NEW.module_code,'') <> 'FIN' THEN
    RAISE EXCEPTION 'fin_ tables must have module_code = FIN';
  END IF;
  IF n LIKE 'lg\_%' ESCAPE '\' AND coalesce(NEW.module_code,'') <> 'LG' THEN
    RAISE EXCEPTION 'lg_ tables must have module_code = LG';
  END IF;
  IF n LIKE 'rpt\_%' ESCAPE '\' AND coalesce(NEW.module_code,'') <> 'RPT' AND NEW.ownership_type <> 'REPORTING' THEN
    RAISE EXCEPTION 'rpt_ tables must have module_code = RPT or ownership_type = REPORTING';
  END IF;
  IF n LIKE 'mig\_%' ESCAPE '\' AND coalesce(NEW.module_code,'') <> 'MIG' AND NEW.ownership_type <> 'MIGRATION' THEN
    RAISE EXCEPTION 'mig_ tables must have module_code = MIG or ownership_type = MIGRATION';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_core_table_registry_validate
BEFORE INSERT OR UPDATE ON public.core_table_registry
FOR EACH ROW EXECUTE FUNCTION public.core_table_registry_validate_naming();
