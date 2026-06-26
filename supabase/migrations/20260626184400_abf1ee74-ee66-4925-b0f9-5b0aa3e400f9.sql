
-- Split the versioning trigger so the FK to comm_media_asset is satisfied
DROP TRIGGER IF EXISTS trg_comm_media_asset_versioning ON public.comm_media_asset;

CREATE OR REPLACE FUNCTION public.tg_comm_media_asset_versioning_bu()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (
    NEW.storage_path IS DISTINCT FROM OLD.storage_path OR
    NEW.external_url IS DISTINCT FROM OLD.external_url OR
    NEW.source       IS DISTINCT FROM OLD.source
  ) THEN
    NEW.version := COALESCE(OLD.version, 1) + 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_comm_media_asset_versioning_au()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.comm_media_asset_version
      (asset_id, version, source, storage_path, external_url, mime_type, file_size_bytes, changed_by, change_reason, snapshot)
    VALUES
      (NEW.id, NEW.version, NEW.source, NEW.storage_path, NEW.external_url,
       NEW.mime_type, NEW.file_size_bytes, NEW.uploaded_by, 'initial', to_jsonb(NEW));
  ELSIF (TG_OP = 'UPDATE') AND (
    NEW.storage_path IS DISTINCT FROM OLD.storage_path OR
    NEW.external_url IS DISTINCT FROM OLD.external_url OR
    NEW.source       IS DISTINCT FROM OLD.source
  ) THEN
    INSERT INTO public.comm_media_asset_version
      (asset_id, version, source, storage_path, external_url, mime_type, file_size_bytes, changed_by, change_reason, snapshot)
    VALUES
      (NEW.id, NEW.version, NEW.source, NEW.storage_path, NEW.external_url,
       NEW.mime_type, NEW.file_size_bytes, NEW.uploaded_by, 'asset replaced', to_jsonb(NEW));
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_comm_media_asset_versioning_bu
  BEFORE UPDATE ON public.comm_media_asset
  FOR EACH ROW EXECUTE FUNCTION public.tg_comm_media_asset_versioning_bu();

CREATE TRIGGER trg_comm_media_asset_versioning_au
  AFTER INSERT OR UPDATE ON public.comm_media_asset
  FOR EACH ROW EXECUTE FUNCTION public.tg_comm_media_asset_versioning_au();

-- Approval workflow + scoping columns
DO $$ BEGIN
  CREATE TYPE public.comm_asset_approval_status AS ENUM
    ('draft','pending_approval','approved','rejected','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.comm_media_asset
  ADD COLUMN IF NOT EXISTS asset_code TEXT,
  ADD COLUMN IF NOT EXISTS module_code TEXT,
  ADD COLUMN IF NOT EXISTS department_code TEXT,
  ADD COLUMN IF NOT EXISTS effective_from DATE,
  ADD COLUMN IF NOT EXISTS effective_to DATE,
  ADD COLUMN IF NOT EXISTS approval_status public.comm_asset_approval_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_by TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_system_default BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS ux_comm_media_asset_code
  ON public.comm_media_asset(asset_code) WHERE asset_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_comm_media_asset_resolver
  ON public.comm_media_asset(category, approval_status, is_active, organization_id, department_id, module_code, location_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_comm_media_asset_sys_default
  ON public.comm_media_asset(category) WHERE is_system_default = TRUE;

-- Mapping table
CREATE TABLE IF NOT EXISTS public.comm_asset_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.comm_media_asset(id) ON DELETE CASCADE,
  category public.comm_asset_category NOT NULL,
  organization_id UUID,
  department_code TEXT,
  module_code TEXT,
  location_id UUID,
  communication_type TEXT,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from DATE,
  effective_to DATE,
  remarks TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comm_asset_mapping TO authenticated, anon;
GRANT ALL ON public.comm_asset_mapping TO service_role;
CREATE INDEX IF NOT EXISTS ix_comm_asset_mapping_lookup
  ON public.comm_asset_mapping(category, communication_type, module_code, department_code, organization_id, location_id)
  WHERE is_active = TRUE;
DROP TRIGGER IF EXISTS trg_comm_asset_mapping_updated_at ON public.comm_asset_mapping;
CREATE TRIGGER trg_comm_asset_mapping_updated_at
  BEFORE UPDATE ON public.comm_asset_mapping
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Priority resolver
CREATE OR REPLACE FUNCTION public.resolve_comm_asset(
  p_category public.comm_asset_category,
  p_organization_id UUID DEFAULT NULL,
  p_department_code TEXT DEFAULT NULL,
  p_module_code TEXT DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_communication_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  asset_id UUID, asset_name TEXT, source public.comm_asset_source,
  storage_path TEXT, external_url TEXT, resolved_via TEXT, is_fallback BOOLEAN
)
LANGUAGE plpgsql STABLE SET search_path = public AS $$
BEGIN
  IF p_communication_type IS NOT NULL THEN
    RETURN QUERY
    SELECT a.id, a.name, a.source, a.storage_path, a.external_url, 'communication_type'::TEXT, FALSE
    FROM public.comm_asset_mapping m
    JOIN public.comm_media_asset a ON a.id = m.asset_id
    WHERE m.category = p_category AND m.communication_type = p_communication_type
      AND m.is_active = TRUE AND a.is_active = TRUE AND a.approval_status = 'approved'
      AND (a.effective_from IS NULL OR a.effective_from <= CURRENT_DATE)
      AND (a.effective_to   IS NULL OR a.effective_to   >= CURRENT_DATE)
    ORDER BY m.priority ASC, a.version DESC LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  IF p_module_code IS NOT NULL THEN
    RETURN QUERY
    SELECT a.id, a.name, a.source, a.storage_path, a.external_url, 'module'::TEXT, FALSE
    FROM public.comm_media_asset a
    WHERE a.category = p_category AND a.module_code = p_module_code
      AND a.is_active = TRUE AND a.approval_status = 'approved'
      AND (a.effective_from IS NULL OR a.effective_from <= CURRENT_DATE)
      AND (a.effective_to   IS NULL OR a.effective_to   >= CURRENT_DATE)
    ORDER BY a.version DESC LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  IF p_department_code IS NOT NULL THEN
    RETURN QUERY
    SELECT a.id, a.name, a.source, a.storage_path, a.external_url, 'department'::TEXT, FALSE
    FROM public.comm_media_asset a
    WHERE a.category = p_category AND a.department_code = p_department_code
      AND a.is_active = TRUE AND a.approval_status = 'approved'
      AND (a.effective_from IS NULL OR a.effective_from <= CURRENT_DATE)
      AND (a.effective_to   IS NULL OR a.effective_to   >= CURRENT_DATE)
    ORDER BY a.version DESC LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  IF p_organization_id IS NOT NULL THEN
    RETURN QUERY
    SELECT a.id, a.name, a.source, a.storage_path, a.external_url, 'organization'::TEXT, FALSE
    FROM public.comm_media_asset a
    WHERE a.category = p_category AND a.organization_id = p_organization_id
      AND a.scope = 'organization' AND a.is_active = TRUE AND a.approval_status = 'approved'
      AND (a.effective_from IS NULL OR a.effective_from <= CURRENT_DATE)
      AND (a.effective_to   IS NULL OR a.effective_to   >= CURRENT_DATE)
    ORDER BY a.version DESC LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  IF p_location_id IS NOT NULL THEN
    RETURN QUERY
    SELECT a.id, a.name, a.source, a.storage_path, a.external_url, 'location'::TEXT, FALSE
    FROM public.comm_media_asset a
    WHERE a.category = p_category AND a.location_id = p_location_id
      AND a.is_active = TRUE AND a.approval_status = 'approved'
    ORDER BY a.version DESC LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  RETURN QUERY
  SELECT a.id, a.name, a.source, a.storage_path, a.external_url,
         CASE WHEN a.is_system_default THEN 'system_default' ELSE 'global' END,
         a.is_system_default
  FROM public.comm_media_asset a
  WHERE a.category = p_category AND a.is_active = TRUE AND a.approval_status = 'approved'
    AND (a.scope = 'global' OR a.is_system_default = TRUE)
  ORDER BY a.is_system_default ASC, a.version DESC LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_comm_asset(public.comm_asset_category, UUID, TEXT, TEXT, UUID, TEXT)
  TO authenticated, anon, service_role;

-- Seed system-default fallbacks
INSERT INTO public.comm_media_asset
  (name, category, source, scope, external_url, is_active, is_system_default, approval_status, asset_code, remarks, uploaded_by)
SELECT v.name, v.cat::public.comm_asset_category, 'external_url'::public.comm_asset_source, 'global'::public.comm_asset_scope,
       '/placeholder.svg', TRUE, TRUE, 'approved'::public.comm_asset_approval_status,
       'SEED-DEFAULT-' || v.cat, 'SEED-System default placeholder. Replace with official asset.', 'system'
FROM (VALUES
  ('System Default Logo','logo'),
  ('System Default Small Logo','logo_small'),
  ('System Default Letterhead Header','letterhead_header'),
  ('System Default Letterhead Footer','letterhead_footer'),
  ('System Default Signature','signature'),
  ('System Default Stamp','stamp'),
  ('System Default Watermark','watermark'),
  ('System Default Email Header','email_header'),
  ('System Default Email Footer','email_footer')
) AS v(name, cat)
ON CONFLICT (category) WHERE is_system_default = TRUE DO NOTHING;
