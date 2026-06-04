-- 1. Table
CREATE TABLE IF NOT EXISTS public.bn_claim_source_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_system VARCHAR(20) NOT NULL CHECK (source_system IN ('LEGACY_BEMA','BN')),
  source_claim_number VARCHAR(50),
  source_claim_seq INTEGER,
  source_benefit_type VARCHAR(20),
  bn_claim_id UUID NULL REFERENCES public.bn_claim(id) ON DELETE SET NULL,
  ssn VARCHAR(50),
  claim_date DATE,
  benefit_code VARCHAR(20),
  routing_basis VARCHAR(20) NOT NULL CHECK (routing_basis IN ('CUTOFF_DATE','MANUAL_LINK','MIGRATED','REOPENED')),
  migration_status VARCHAR(20) NOT NULL DEFAULT 'NONE'
    CHECK (migration_status IN ('NONE','PENDING','IN_PROGRESS','MIGRATED','FAILED','ROLLED_BACK')),
  linked_by VARCHAR(50),
  linked_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by VARCHAR(50),
  modified_by VARCHAR(50)
);

-- 2. Indexes for lookup performance
CREATE INDEX IF NOT EXISTS idx_bcsm_lookup
  ON public.bn_claim_source_map (source_claim_number, source_claim_seq, source_benefit_type);
CREATE INDEX IF NOT EXISTS idx_bcsm_ssn ON public.bn_claim_source_map (ssn);
CREATE INDEX IF NOT EXISTS idx_bcsm_bn_claim_id ON public.bn_claim_source_map (bn_claim_id);
CREATE INDEX IF NOT EXISTS idx_bcsm_source_system ON public.bn_claim_source_map (source_system);
CREATE INDEX IF NOT EXISTS idx_bcsm_migration_status ON public.bn_claim_source_map (migration_status);

-- 3. Grants (RLS intentionally disabled per project rule — role-based security only)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_claim_source_map TO authenticated;
GRANT ALL ON public.bn_claim_source_map TO service_role;

-- 4. updated_at trigger
CREATE OR REPLACE FUNCTION public.trg_bn_claim_source_map_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS bn_claim_source_map_set_updated_at ON public.bn_claim_source_map;
CREATE TRIGGER bn_claim_source_map_set_updated_at
  BEFORE UPDATE ON public.bn_claim_source_map
  FOR EACH ROW EXECUTE FUNCTION public.trg_bn_claim_source_map_set_updated_at();

-- 5. Audit trigger -> system_audit_trail
CREATE OR REPLACE FUNCTION public.trg_audit_bn_claim_source_map()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_user_id UUID;
  v_user_name TEXT;
  v_record_id TEXT;
  v_user_code TEXT;
BEGIN
  v_record_id := COALESCE(NEW.id, OLD.id)::text;

  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    v_user_code := NEW.created_by;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
    v_user_code := COALESCE(NEW.modified_by, NEW.created_by);
  ELSE
    v_action := 'DELETE';
    v_user_code := OLD.modified_by;
  END IF;

  BEGIN
    SELECT id, full_name INTO v_user_id, v_user_name
    FROM public.profiles
    WHERE user_code = v_user_code
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  INSERT INTO public.system_audit_trail (
    user_id, user_name, action, entity_type, entity_id, module,
    before_value, after_value, severity, timestamp
  ) VALUES (
    v_user_id,
    COALESCE(v_user_name, 'SYSTEM'),
    v_action,
    'BnClaimSourceMap',
    v_record_id,
    'Benefits',
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    'info',
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in trg_audit_bn_claim_source_map: % %', SQLERRM, SQLSTATE;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS audit_bn_claim_source_map_trigger ON public.bn_claim_source_map;
CREATE TRIGGER audit_bn_claim_source_map_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.bn_claim_source_map
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_bn_claim_source_map();

-- 6. Seed BENEFITS_CUTOFF_DATE configuration (idempotent)
INSERT INTO public.system_settings (
  setting_key, setting_value, setting_type, display_name, description, category, is_editable
)
SELECT
  'BENEFITS_CUTOFF_DATE',
  '2026-01-01',
  'date',
  'Benefits Cutoff Date',
  'Claims with claim_date on/after this date are served from BN tables; earlier claims from legacy BEMA. Overridden per claim by entries in bn_claim_source_map.',
  'Benefits',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_settings WHERE setting_key = 'BENEFITS_CUTOFF_DATE'
);