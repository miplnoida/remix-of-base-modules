
-- ===========================================================================
-- LEGAL REFERENCE — ENTERPRISE VERSIONING REFACTOR
-- Master/version split, immutability, lifecycle, snapshots, effective dating
-- ===========================================================================

-- 1. VERSION TABLE -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.core_legal_reference_version (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_reference_id       UUID NOT NULL REFERENCES public.core_legal_reference(id) ON DELETE CASCADE,
  version_number           INTEGER NOT NULL,
  version_label            VARCHAR(64),
  section                  VARCHAR(64),
  subsection               VARCHAR(64),
  regulation               VARCHAR(255),
  citation_text            TEXT,
  full_reference_text      TEXT,
  official_text            TEXT,
  summary                  TEXT,
  source_url               TEXT,
  gazette_number           VARCHAR(120),
  official_document_id     UUID,
  effective_from           DATE NOT NULL,
  effective_to             DATE,
  version_status           VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  change_reason            TEXT,
  change_summary           TEXT,
  approved_by              VARCHAR(50),
  approved_at              TIMESTAMPTZ,
  published_by             VARCHAR(50),
  published_at             TIMESTAMPTZ,
  supersedes_version_id    UUID REFERENCES public.core_legal_reference_version(id) ON DELETE SET NULL,
  created_by               VARCHAR(50),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by               VARCHAR(50),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clrv_version_status_chk CHECK (
    version_status IN ('DRAFT','SUBMITTED','REVIEWED','APPROVED','PUBLISHED','SUPERSEDED','ARCHIVED')
  ),
  CONSTRAINT clrv_effective_chk CHECK (effective_to IS NULL OR effective_to > effective_from),
  CONSTRAINT clrv_unique_version UNIQUE (legal_reference_id, version_number),
  CONSTRAINT clrv_unique_effective UNIQUE (legal_reference_id, effective_from)
);

CREATE INDEX IF NOT EXISTS clrv_ref_idx        ON public.core_legal_reference_version(legal_reference_id);
CREATE INDEX IF NOT EXISTS clrv_status_idx     ON public.core_legal_reference_version(version_status);
CREATE INDEX IF NOT EXISTS clrv_effective_idx  ON public.core_legal_reference_version(legal_reference_id, effective_from DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_legal_reference_version TO authenticated;
GRANT ALL ON public.core_legal_reference_version TO service_role;

-- 2. MASTER ADDITIONS --------------------------------------------------------
ALTER TABLE public.core_legal_reference
  ADD COLUMN IF NOT EXISTS current_version_id UUID REFERENCES public.core_legal_reference_version(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_reference_id UUID REFERENCES public.core_legal_reference(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS jurisdiction_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS reference_type VARCHAR(32);

UPDATE public.core_legal_reference
SET reference_type = COALESCE(reference_type, ref_type, 'OTHER'),
    jurisdiction_name = COALESCE(jurisdiction_name, jurisdiction)
WHERE reference_type IS NULL OR jurisdiction_name IS NULL;

-- 3. DATA MIGRATION: build v1 versions from existing master rows -------------
INSERT INTO public.core_legal_reference_version (
  legal_reference_id, version_number, section, subsection, regulation,
  citation_text, full_reference_text, summary, source_url,
  effective_from, effective_to, version_status,
  published_at, created_by, created_at, updated_by, updated_at
)
SELECT
  m.id,
  COALESCE(m.version_number, 1),
  m.section, m.subsection, m.regulation,
  m.full_reference_text, m.full_reference_text, m.notes, m.ref_url,
  m.effective_from, m.effective_to,
  CASE UPPER(COALESCE(m.status,'ACTIVE'))
    WHEN 'ACTIVE'     THEN 'PUBLISHED'
    WHEN 'DRAFT'      THEN 'DRAFT'
    WHEN 'SUPERSEDED' THEN 'SUPERSEDED'
    WHEN 'REPEALED'   THEN 'ARCHIVED'
    WHEN 'ARCHIVED'   THEN 'ARCHIVED'
    ELSE 'PUBLISHED'
  END,
  CASE WHEN UPPER(COALESCE(m.status,'ACTIVE')) = 'ACTIVE' THEN m.updated_at END,
  m.created_by, m.created_at, m.updated_by, m.updated_at
FROM public.core_legal_reference m
WHERE NOT EXISTS (
  SELECT 1 FROM public.core_legal_reference_version v WHERE v.legal_reference_id = m.id
);

-- Link master.current_version_id to its v1
UPDATE public.core_legal_reference m
SET current_version_id = v.id
FROM public.core_legal_reference_version v
WHERE v.legal_reference_id = m.id
  AND v.version_number = COALESCE(m.version_number,1)
  AND m.current_version_id IS NULL;

-- Resolve supersedes chain at version level
UPDATE public.core_legal_reference_version v
SET supersedes_version_id = prev.current_version_id
FROM public.core_legal_reference m
JOIN public.core_legal_reference prev ON prev.id = m.supersedes_id
WHERE v.legal_reference_id = m.id
  AND v.supersedes_version_id IS NULL
  AND prev.current_version_id IS NOT NULL;

-- 4. MODULE MAPPING: add version pin -----------------------------------------
ALTER TABLE public.core_module_legal_reference
  ADD COLUMN IF NOT EXISTS legal_reference_version_id UUID
    REFERENCES public.core_legal_reference_version(id) ON DELETE SET NULL;

-- 5. TEMPLATE MAPPING: add version pin ---------------------------------------
ALTER TABLE public.core_template_legal_reference
  ADD COLUMN IF NOT EXISTS legal_reference_version_id UUID
    REFERENCES public.core_legal_reference_version(id) ON DELETE SET NULL;

-- 6. GENERATED DOCUMENT SNAPSHOT TABLE (write-once) --------------------------
CREATE TABLE IF NOT EXISTS public.core_generated_document_legal_reference (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_document_id       UUID NOT NULL REFERENCES public.core_generated_document(id) ON DELETE CASCADE,
  legal_reference_id          UUID NOT NULL REFERENCES public.core_legal_reference(id) ON DELETE RESTRICT,
  legal_reference_version_id  UUID REFERENCES public.core_legal_reference_version(id) ON DELETE RESTRICT,
  ref_code                    VARCHAR(64) NOT NULL,
  citation_snapshot           TEXT,
  full_reference_snapshot     TEXT,
  effective_from_snapshot     DATE,
  effective_to_snapshot       DATE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cgdlr_doc_idx ON public.core_generated_document_legal_reference(generated_document_id);
CREATE INDEX IF NOT EXISTS cgdlr_ref_idx ON public.core_generated_document_legal_reference(legal_reference_id);

GRANT SELECT, INSERT ON public.core_generated_document_legal_reference TO authenticated;
GRANT ALL ON public.core_generated_document_legal_reference TO service_role;

-- 7. IMMUTABILITY TRIGGER ON VERSION -----------------------------------------
CREATE OR REPLACE FUNCTION public.core_legal_ref_version_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  bypass BOOLEAN := COALESCE(current_setting('app.legal_ref_lifecycle', true) = 'on', false);
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.version_status IN ('PUBLISHED','SUPERSEDED','ARCHIVED') AND NOT bypass THEN
      RAISE EXCEPTION 'Cannot delete legal reference version % in status %', OLD.id, OLD.version_status;
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE
  IF OLD.version_status = 'PUBLISHED' AND NOT bypass THEN
    -- Only effective_to, version_status (to SUPERSEDED/ARCHIVED), updated_by/at may change
    IF NEW.version_number     IS DISTINCT FROM OLD.version_number
    OR NEW.section            IS DISTINCT FROM OLD.section
    OR NEW.subsection         IS DISTINCT FROM OLD.subsection
    OR NEW.regulation         IS DISTINCT FROM OLD.regulation
    OR NEW.citation_text      IS DISTINCT FROM OLD.citation_text
    OR NEW.full_reference_text IS DISTINCT FROM OLD.full_reference_text
    OR NEW.official_text      IS DISTINCT FROM OLD.official_text
    OR NEW.summary            IS DISTINCT FROM OLD.summary
    OR NEW.source_url         IS DISTINCT FROM OLD.source_url
    OR NEW.gazette_number     IS DISTINCT FROM OLD.gazette_number
    OR NEW.effective_from     IS DISTINCT FROM OLD.effective_from
    OR NEW.legal_reference_id IS DISTINCT FROM OLD.legal_reference_id
    THEN
      RAISE EXCEPTION 'Published legal reference version % is immutable (use a new version)', OLD.id;
    END IF;
    IF NEW.version_status NOT IN ('PUBLISHED','SUPERSEDED','ARCHIVED') THEN
      RAISE EXCEPTION 'Published version % can only transition to SUPERSEDED or ARCHIVED', OLD.id;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_core_legal_ref_version_guard ON public.core_legal_reference_version;
CREATE TRIGGER trg_core_legal_ref_version_guard
  BEFORE UPDATE OR DELETE ON public.core_legal_reference_version
  FOR EACH ROW EXECUTE FUNCTION public.core_legal_ref_version_guard();

-- 8. OVERLAP PREVENTION (PUBLISHED versions) ---------------------------------
CREATE OR REPLACE FUNCTION public.core_legal_ref_version_overlap_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.version_status <> 'PUBLISHED' THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.core_legal_reference_version v
    WHERE v.legal_reference_id = NEW.legal_reference_id
      AND v.id <> NEW.id
      AND v.version_status = 'PUBLISHED'
      AND daterange(v.effective_from, COALESCE(v.effective_to,'infinity'::date), '[)')
        && daterange(NEW.effective_from, COALESCE(NEW.effective_to,'infinity'::date), '[)')
  ) THEN
    RAISE EXCEPTION 'Overlapping PUBLISHED effective period for legal_reference_id=%', NEW.legal_reference_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_core_legal_ref_version_overlap ON public.core_legal_reference_version;
CREATE TRIGGER trg_core_legal_ref_version_overlap
  BEFORE INSERT OR UPDATE OF version_status, effective_from, effective_to
  ON public.core_legal_reference_version
  FOR EACH ROW EXECUTE FUNCTION public.core_legal_ref_version_overlap_check();

-- 9. GENERATED DOCUMENT SNAPSHOT IMMUTABILITY --------------------------------
CREATE OR REPLACE FUNCTION public.core_gen_doc_legal_ref_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Generated document legal reference snapshots are write-once';
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_cgdlr_guard ON public.core_generated_document_legal_reference;
CREATE TRIGGER trg_cgdlr_guard
  BEFORE UPDATE OR DELETE ON public.core_generated_document_legal_reference
  FOR EACH ROW EXECUTE FUNCTION public.core_gen_doc_legal_ref_guard();

-- 10. LIFECYCLE FUNCTIONS (SECURITY DEFINER) ---------------------------------
CREATE OR REPLACE FUNCTION public.core_legal_ref_audit(
  p_entity_id UUID, p_action TEXT, p_user_code TEXT, p_before JSONB, p_after JSONB, p_reason TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO public.legal_admin_audit(entity_type, entity_id, action, user_name, before_data, after_data, changes)
  VALUES ('core_legal_reference_version', p_entity_id, p_action, COALESCE(p_user_code,'system'),
          p_before, p_after, jsonb_build_object('reason', p_reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.core_legal_ref_create_version(
  p_master_id UUID, p_user_code TEXT, p_effective_from DATE, p_change_reason TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_next INT;
  v_id UUID;
  v_src public.core_legal_reference_version%ROWTYPE;
BEGIN
  SELECT COALESCE(MAX(version_number),0)+1 INTO v_next
  FROM public.core_legal_reference_version WHERE legal_reference_id = p_master_id;

  SELECT * INTO v_src FROM public.core_legal_reference_version
   WHERE legal_reference_id = p_master_id
   ORDER BY version_number DESC LIMIT 1;

  INSERT INTO public.core_legal_reference_version(
    legal_reference_id, version_number, section, subsection, regulation,
    citation_text, full_reference_text, official_text, summary, source_url,
    gazette_number, effective_from, version_status, change_reason, created_by, updated_by
  ) VALUES (
    p_master_id, v_next, v_src.section, v_src.subsection, v_src.regulation,
    v_src.citation_text, v_src.full_reference_text, v_src.official_text, v_src.summary, v_src.source_url,
    v_src.gazette_number, p_effective_from, 'DRAFT', p_change_reason, p_user_code, p_user_code
  ) RETURNING id INTO v_id;

  PERFORM public.core_legal_ref_audit(v_id, 'CREATE_VERSION', p_user_code, NULL,
    jsonb_build_object('version_number', v_next, 'effective_from', p_effective_from), p_change_reason);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.core_legal_ref_transition(
  p_version_id UUID, p_to_status TEXT, p_user_code TEXT, p_reason TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_old public.core_legal_reference_version%ROWTYPE;
  v_allowed BOOLEAN := false;
BEGIN
  SELECT * INTO v_old FROM public.core_legal_reference_version WHERE id = p_version_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Version % not found', p_version_id; END IF;

  v_allowed := (v_old.version_status, p_to_status) IN (
    ('DRAFT','SUBMITTED'),('SUBMITTED','REVIEWED'),('REVIEWED','APPROVED'),
    ('APPROVED','PUBLISHED'),('SUBMITTED','DRAFT'),('REVIEWED','DRAFT'),
    ('PUBLISHED','SUPERSEDED'),('PUBLISHED','ARCHIVED'),('SUPERSEDED','ARCHIVED')
  );
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Illegal transition % -> %', v_old.version_status, p_to_status;
  END IF;

  PERFORM set_config('app.legal_ref_lifecycle','on', true);

  UPDATE public.core_legal_reference_version
     SET version_status = p_to_status,
         approved_by    = CASE WHEN p_to_status='APPROVED' THEN p_user_code ELSE approved_by END,
         approved_at    = CASE WHEN p_to_status='APPROVED' THEN now() ELSE approved_at END,
         published_by   = CASE WHEN p_to_status='PUBLISHED' THEN p_user_code ELSE published_by END,
         published_at   = CASE WHEN p_to_status='PUBLISHED' THEN now() ELSE published_at END,
         updated_by     = p_user_code
   WHERE id = p_version_id;

  IF p_to_status = 'PUBLISHED' THEN
    -- Supersede any other published version for same master
    UPDATE public.core_legal_reference_version
       SET version_status = 'SUPERSEDED',
           effective_to   = COALESCE(effective_to, v_old.effective_from - 1),
           updated_by     = p_user_code
     WHERE legal_reference_id = v_old.legal_reference_id
       AND id <> p_version_id
       AND version_status = 'PUBLISHED';

    UPDATE public.core_legal_reference
       SET current_version_id = p_version_id,
           status = 'ACTIVE',
           section = v_old.section,
           subsection = v_old.subsection,
           regulation = v_old.regulation,
           full_reference_text = v_old.full_reference_text,
           effective_from = v_old.effective_from,
           effective_to = v_old.effective_to,
           version_number = v_old.version_number,
           updated_by = p_user_code,
           updated_at = now()
     WHERE id = v_old.legal_reference_id;
  END IF;

  PERFORM set_config('app.legal_ref_lifecycle','off', true);

  PERFORM public.core_legal_ref_audit(p_version_id, 'TRANSITION_'||p_to_status, p_user_code,
    to_jsonb(v_old), (SELECT to_jsonb(x) FROM public.core_legal_reference_version x WHERE x.id = p_version_id),
    p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_active_legal_reference_version(
  p_ref_code TEXT, p_country_code TEXT, p_as_of DATE DEFAULT CURRENT_DATE
) RETURNS SETOF public.core_legal_reference_version
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT v.*
  FROM public.core_legal_reference m
  JOIN public.core_legal_reference_version v ON v.legal_reference_id = m.id
  WHERE m.ref_code = p_ref_code
    AND m.country_code = p_country_code
    AND v.version_status = 'PUBLISHED'
    AND v.effective_from <= p_as_of
    AND (v.effective_to IS NULL OR v.effective_to > p_as_of)
  ORDER BY v.effective_from DESC
  LIMIT 1;
$$;

-- 11. BACKFILL: expand any existing JSONB snapshots into snapshot rows -------
INSERT INTO public.core_generated_document_legal_reference (
  generated_document_id, legal_reference_id, legal_reference_version_id,
  ref_code, citation_snapshot, full_reference_snapshot,
  effective_from_snapshot, effective_to_snapshot
)
SELECT
  d.id,
  COALESCE((s->>'legal_reference_id')::uuid, m.id),
  v.id,
  COALESCE(s->>'ref_code', m.ref_code),
  s->>'citation_text',
  COALESCE(s->>'full_reference_text', v.full_reference_text),
  COALESCE(NULLIF(s->>'effective_from','')::date, v.effective_from),
  COALESCE(NULLIF(s->>'effective_to','')::date, v.effective_to)
FROM public.core_generated_document d
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(d.legal_references_snapshot, '[]'::jsonb)) s
LEFT JOIN public.core_legal_reference m ON m.id = NULLIF(s->>'legal_reference_id','')::uuid
LEFT JOIN public.core_legal_reference_version v ON v.id = m.current_version_id
WHERE m.id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.core_generated_document_legal_reference x
    WHERE x.generated_document_id = d.id AND x.legal_reference_id = m.id
  );

-- 12. BACKFILL: pin template legal refs to current_version_id ----------------
UPDATE public.core_template_legal_reference t
SET legal_reference_version_id = m.current_version_id
FROM public.core_legal_reference m
WHERE t.legal_reference_id = m.id
  AND t.legal_reference_version_id IS NULL
  AND m.current_version_id IS NOT NULL;
