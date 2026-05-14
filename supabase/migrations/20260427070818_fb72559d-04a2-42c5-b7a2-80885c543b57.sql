
-- =====================================================================
-- DOCUMENT LIFECYCLE REFACTOR — Phase 1
-- =====================================================================

-- 1. Create DMS storage buckets (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ip-dms', 'ip-dms', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('er-dms', 'er-dms', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Schema additions to override tables
ALTER TABLE public.ip_application_documents
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

ALTER TABLE public.er_application_documents
  ADD COLUMN IF NOT EXISTS source_document_id text,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ip_app_docs_source_doc
  ON public.ip_application_documents(application_reference_number, source_document_id)
  WHERE source_document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_er_app_docs_source_doc
  ON public.er_application_documents(source_application_reference, source_document_id)
  WHERE source_document_id IS NOT NULL;

-- 3. Add ssn column to ip_documents so SSN can cascade on verification
ALTER TABLE public.ip_documents
  ADD COLUMN IF NOT EXISTS ssn varchar(6);

CREATE INDEX IF NOT EXISTS idx_ip_documents_ssn ON public.ip_documents(ssn);
CREATE INDEX IF NOT EXISTS idx_ip_documents_unique_uuid ON public.ip_documents(unique_uuid);

-- Note: We don't add an FK on ip_documents.ssn → ip_master.ssn because ip_master.ssn is nullable
-- and ip_documents may be created with the temporary SSN before it's final. We cascade manually
-- in change_ip_status when the SSN finalizes.

-- 4. Lightweight audit log for employer flows
CREATE TABLE IF NOT EXISTS public.er_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id text,
  regno varchar(20),
  source_application_reference text,
  action text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_by_code varchar(50),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_er_audit_log_regno ON public.er_audit_log(regno);
CREATE INDEX IF NOT EXISTS idx_er_audit_log_app_ref ON public.er_audit_log(source_application_reference);

-- =====================================================================
-- 5. RPCs: IP Application Document overrides
-- =====================================================================

CREATE OR REPLACE FUNCTION public.ip_app_doc_upsert(
  p_application_reference text,
  p_source_document_id   text,        -- null = brand new, value = replaces an external doc
  p_file_meta            jsonb,       -- { document_name, document_type, file_name, file_path, url, mime_type, file_size, verification_category, supportive_doc_type, is_supportive, doc_code, metadata }
  p_user_id              uuid,
  p_user_code            text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_ssn varchar(6);
BEGIN
  IF p_application_reference IS NULL OR length(trim(p_application_reference)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED: application_reference is required';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: p_user_id is required';
  END IF;

  -- Resolve SSN if the application has already been converted; otherwise use a placeholder
  -- temp value derived from the application reference (the override table requires SSN NOT NULL).
  SELECT ssn INTO v_ssn
  FROM public.ip_master
  WHERE application_id = p_application_reference
     OR application_id::text = p_application_reference
  LIMIT 1;

  IF v_ssn IS NULL THEN
    -- Pre-conversion: park rows under a deterministic placeholder derived from app_ref.
    -- We use the last 6 chars of the reference, padded with 'A'.
    v_ssn := UPPER(LPAD(RIGHT(regexp_replace(p_application_reference, '[^A-Za-z0-9]', '', 'g'), 6), 6, '0'));
  END IF;

  -- If a previous override exists for the same source_document_id, mark it inactive (replaced)
  IF p_source_document_id IS NOT NULL THEN
    UPDATE public.ip_application_documents
       SET is_deleted = true
     WHERE application_reference_number = p_application_reference
       AND source_document_id = p_source_document_id
       AND is_deleted = false;
  END IF;

  INSERT INTO public.ip_application_documents (
    ssn, application_reference_number, document_name, document_type, file_name,
    file_path, url, mime_type, file_size, uploaded_at, source_document_id,
    verification_category, supportive_doc_type, is_supportive, metadata, created_by, uploaded_by, is_deleted
  ) VALUES (
    v_ssn,
    p_application_reference,
    NULLIF(p_file_meta->>'document_name',''),
    NULLIF(p_file_meta->>'document_type',''),
    NULLIF(p_file_meta->>'file_name',''),
    NULLIF(p_file_meta->>'file_path',''),
    NULLIF(p_file_meta->>'url',''),
    NULLIF(p_file_meta->>'mime_type',''),
    NULLIF(p_file_meta->>'file_size','')::bigint,
    now(),
    p_source_document_id,
    NULLIF(p_file_meta->>'verification_category',''),
    NULLIF(p_file_meta->>'supportive_doc_type',''),
    COALESCE((p_file_meta->>'is_supportive')::boolean, false),
    CASE WHEN p_file_meta ? 'metadata' THEN p_file_meta->'metadata' ELSE NULL END,
    p_user_id,
    p_user_id,
    false
  )
  RETURNING id INTO v_id;

  INSERT INTO public.ip_audit_log (table_name, record_id, action, changed_by, new_value, field_name)
  VALUES ('ip_application_documents', v_id::text,
          CASE WHEN p_source_document_id IS NULL THEN 'DOC_UPLOAD' ELSE 'DOC_REPLACE' END,
          p_user_id, p_file_meta->>'file_name', 'file_name');

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ip_app_doc_delete(
  p_application_reference text,
  p_doc_id_or_source_id   text,   -- accepts either the override row id OR the external source_document_id
  p_user_id               uuid,
  p_user_code             text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing uuid;
  v_ssn varchar(6);
BEGIN
  IF p_application_reference IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED: application_reference is required';
  END IF;

  -- Try as override row id first
  BEGIN
    SELECT id INTO v_existing FROM public.ip_application_documents
     WHERE id = p_doc_id_or_source_id::uuid
       AND application_reference_number = p_application_reference
     LIMIT 1;
  EXCEPTION WHEN invalid_text_representation THEN
    v_existing := NULL;
  END;

  IF v_existing IS NOT NULL THEN
    UPDATE public.ip_application_documents
       SET is_deleted = true
     WHERE id = v_existing;
  ELSE
    -- Treat as tombstone for an external document
    SELECT ssn INTO v_ssn FROM public.ip_master
     WHERE application_id = p_application_reference LIMIT 1;
    IF v_ssn IS NULL THEN
      v_ssn := UPPER(LPAD(RIGHT(regexp_replace(p_application_reference, '[^A-Za-z0-9]', '', 'g'), 6), 6, '0'));
    END IF;

    INSERT INTO public.ip_application_documents (
      ssn, application_reference_number, source_document_id, is_deleted, created_by, uploaded_by
    ) VALUES (
      v_ssn, p_application_reference, p_doc_id_or_source_id, true, p_user_id, p_user_id
    );
  END IF;

  INSERT INTO public.ip_audit_log (table_name, record_id, action, changed_by, field_name, new_value)
  VALUES ('ip_application_documents', p_doc_id_or_source_id, 'DOC_DELETE', p_user_id, 'is_deleted', 'true');
END;
$$;

-- Resolve: merge external API docs with overrides, hide tombstones and replaced externals
CREATE OR REPLACE FUNCTION public.ip_app_docs_resolve(
  p_application_reference text,
  p_external_docs         jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_overrides jsonb;
  v_replaced_or_deleted_ids text[];
  v_filtered_external jsonb;
  v_active_overrides jsonb;
BEGIN
  -- Collect source_document_ids that have been replaced or deleted via overrides
  SELECT COALESCE(array_agg(DISTINCT source_document_id), ARRAY[]::text[])
    INTO v_replaced_or_deleted_ids
    FROM public.ip_application_documents
   WHERE application_reference_number = p_application_reference
     AND source_document_id IS NOT NULL;

  -- Filter external docs: drop those that are replaced/deleted
  SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) INTO v_filtered_external
  FROM jsonb_array_elements(COALESCE(p_external_docs, '[]'::jsonb)) d
  WHERE NOT ( (d->>'id') = ANY(v_replaced_or_deleted_ids) );

  -- Active (non-deleted) override docs
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', id,
           'source_document_id', source_document_id,
           'document_name', document_name,
           'document_type', document_type,
           'file_name', file_name,
           'file_path', file_path,
           'url', url,
           'mime_type', mime_type,
           'file_size', file_size,
           'uploaded_at', uploaded_at,
           'verification_category', verification_category,
           'supportive_doc_type', supportive_doc_type,
           'is_supportive', is_supportive,
           'metadata', metadata,
           'source', 'override'
         )), '[]'::jsonb)
    INTO v_active_overrides
    FROM public.ip_application_documents
   WHERE application_reference_number = p_application_reference
     AND is_deleted = false
     AND file_path IS NOT NULL;  -- exclude pure tombstones

  RETURN jsonb_build_object(
    'external', v_filtered_external,
    'overrides', v_active_overrides,
    'merged', v_filtered_external || v_active_overrides
  );
END;
$$;

-- =====================================================================
-- 6. RPCs: ER Application Document overrides (mirror of IP)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.er_app_doc_upsert(
  p_source_application_reference text,
  p_source_document_id           text,
  p_file_meta                    jsonb,
  p_user_id                      uuid,
  p_user_code                    text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_regno varchar(20);
BEGIN
  IF p_source_application_reference IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED: source_application_reference is required';
  END IF;

  -- Resolve regno if already converted; otherwise use a placeholder derived from the app reference
  SELECT m.regno INTO v_regno
    FROM public.er_master m
   WHERE m.regno = p_source_application_reference
   LIMIT 1;

  IF v_regno IS NULL THEN
    v_regno := UPPER(LPAD(RIGHT(regexp_replace(p_source_application_reference, '[^A-Za-z0-9]', '', 'g'), 6), 6, '0'));
  END IF;

  IF p_source_document_id IS NOT NULL THEN
    UPDATE public.er_application_documents
       SET is_active = false, is_deleted = true, updated_at = now()
     WHERE source_application_reference = p_source_application_reference
       AND source_document_id = p_source_document_id
       AND is_active = true;
  END IF;

  INSERT INTO public.er_application_documents (
    regno, source_application_reference, doc_code, document_type, document_description,
    file_name, file_path, storage_url, file_size, mime_type, is_active,
    uploaded_by, uploaded_by_code, metadata, source_document_id, is_deleted
  ) VALUES (
    v_regno,
    p_source_application_reference,
    NULLIF(p_file_meta->>'doc_code',''),
    NULLIF(p_file_meta->>'document_type',''),
    NULLIF(p_file_meta->>'document_description',''),
    COALESCE(NULLIF(p_file_meta->>'file_name',''), 'unknown'),
    COALESCE(NULLIF(p_file_meta->>'file_path',''), ''),
    COALESCE(NULLIF(p_file_meta->>'storage_url', p_file_meta->>'url'), ''),
    NULLIF(p_file_meta->>'file_size','')::bigint,
    NULLIF(p_file_meta->>'mime_type',''),
    true,
    p_user_id::text,
    p_user_code,
    CASE WHEN p_file_meta ? 'metadata' THEN p_file_meta->'metadata' ELSE NULL END,
    p_source_document_id,
    false
  )
  RETURNING id INTO v_id;

  INSERT INTO public.er_audit_log (table_name, record_id, source_application_reference, action, changed_by, changed_by_code, new_value, field_name)
  VALUES ('er_application_documents', v_id::text, p_source_application_reference,
          CASE WHEN p_source_document_id IS NULL THEN 'DOC_UPLOAD' ELSE 'DOC_REPLACE' END,
          p_user_id, p_user_code, p_file_meta->>'file_name', 'file_name');

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.er_app_doc_delete(
  p_source_application_reference text,
  p_doc_id_or_source_id          text,
  p_user_id                      uuid,
  p_user_code                    text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing uuid;
  v_regno varchar(20);
BEGIN
  BEGIN
    SELECT id INTO v_existing FROM public.er_application_documents
     WHERE id = p_doc_id_or_source_id::uuid
       AND source_application_reference = p_source_application_reference
     LIMIT 1;
  EXCEPTION WHEN invalid_text_representation THEN
    v_existing := NULL;
  END;

  IF v_existing IS NOT NULL THEN
    UPDATE public.er_application_documents
       SET is_active = false, is_deleted = true, updated_at = now()
     WHERE id = v_existing;
  ELSE
    SELECT m.regno INTO v_regno FROM public.er_master m
     WHERE m.regno = p_source_application_reference LIMIT 1;
    IF v_regno IS NULL THEN
      v_regno := UPPER(LPAD(RIGHT(regexp_replace(p_source_application_reference, '[^A-Za-z0-9]', '', 'g'), 6), 6, '0'));
    END IF;

    INSERT INTO public.er_application_documents (
      regno, source_application_reference, file_name, file_path, storage_url,
      is_active, is_deleted, source_document_id, uploaded_by, uploaded_by_code
    ) VALUES (
      v_regno, p_source_application_reference, '', '', '', false, true,
      p_doc_id_or_source_id, p_user_id::text, p_user_code
    );
  END IF;

  INSERT INTO public.er_audit_log (table_name, record_id, source_application_reference, action, changed_by, changed_by_code, field_name, new_value)
  VALUES ('er_application_documents', p_doc_id_or_source_id, p_source_application_reference, 'DOC_DELETE', p_user_id, p_user_code, 'is_deleted', 'true');
END;
$$;

CREATE OR REPLACE FUNCTION public.er_app_docs_resolve(
  p_source_application_reference text,
  p_external_docs                jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_replaced_or_deleted_ids text[];
  v_filtered_external jsonb;
  v_active_overrides jsonb;
BEGIN
  SELECT COALESCE(array_agg(DISTINCT source_document_id), ARRAY[]::text[])
    INTO v_replaced_or_deleted_ids
    FROM public.er_application_documents
   WHERE source_application_reference = p_source_application_reference
     AND source_document_id IS NOT NULL;

  SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) INTO v_filtered_external
  FROM jsonb_array_elements(COALESCE(p_external_docs, '[]'::jsonb)) d
  WHERE NOT ( (d->>'id') = ANY(v_replaced_or_deleted_ids) );

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', id,
           'source_document_id', source_document_id,
           'document_name', file_name,
           'document_type', document_type,
           'document_description', document_description,
           'doc_code', doc_code,
           'file_name', file_name,
           'file_path', file_path,
           'url', storage_url,
           'storage_url', storage_url,
           'mime_type', mime_type,
           'file_size', file_size,
           'metadata', metadata,
           'source', 'override'
         )), '[]'::jsonb)
    INTO v_active_overrides
    FROM public.er_application_documents
   WHERE source_application_reference = p_source_application_reference
     AND is_active = true
     AND COALESCE(is_deleted, false) = false
     AND COALESCE(file_path, '') <> '';

  RETURN jsonb_build_object(
    'external', v_filtered_external,
    'overrides', v_active_overrides,
    'merged', v_filtered_external || v_active_overrides
  );
END;
$$;

-- =====================================================================
-- 7. Extend convert_application_atomic to also write into ip_documents (master)
-- =====================================================================
-- Wrapper trigger-style approach: post-process by calling a small helper that
-- mirrors documents from ip_application_documents into ip_documents at conversion.
-- We add a helper RPC and a small extension: when conversion succeeds we call it
-- explicitly from the conversion RPC. Easiest path: create a helper, then patch
-- convert_application_atomic to invoke it at the end.

CREATE OR REPLACE FUNCTION public.ip_mirror_app_docs_to_master(
  p_unique_uuid              uuid,
  p_ssn                      varchar(6),
  p_application_reference    text,
  p_user_id                  uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO public.ip_documents (
    unique_uuid, ssn, document_type, document_name, file_path, file_size, mime_type,
    uploaded_at, uploaded_by, is_temp, verification_category, supportive_doc_type, is_supportive
  )
  SELECT
    p_unique_uuid,
    p_ssn,
    COALESCE(d.document_type, 'unknown'),
    COALESCE(d.document_name, d.file_name, 'unknown'),
    COALESCE(d.file_path, d.url, ''),
    d.file_size::int,
    d.mime_type,
    COALESCE(d.uploaded_at, now()),
    p_user_id,
    true,
    d.verification_category,
    d.supportive_doc_type,
    COALESCE(d.is_supportive, false)
  FROM public.ip_application_documents d
  WHERE d.application_reference_number = p_application_reference
    AND COALESCE(d.is_deleted, false) = false
    AND COALESCE(d.file_path, d.url, '') <> '';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =====================================================================
-- 8. Update change_ip_status to cascade SSN into ip_documents on V transition
-- =====================================================================
-- We do not rewrite the entire function; we add a small post-step trigger.
-- Approach: AFTER UPDATE trigger on ip_master that, when ssn changes, also
-- updates ip_documents.ssn for matching unique_uuid.

CREATE OR REPLACE FUNCTION public.ip_master_ssn_cascade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ssn IS DISTINCT FROM OLD.ssn AND NEW.ssn IS NOT NULL THEN
    UPDATE public.ip_documents
       SET ssn = NEW.ssn
     WHERE unique_uuid = NEW.unique_uuid;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ip_master_ssn_cascade ON public.ip_master;
CREATE TRIGGER trg_ip_master_ssn_cascade
AFTER UPDATE OF ssn ON public.ip_master
FOR EACH ROW
EXECUTE FUNCTION public.ip_master_ssn_cascade();
