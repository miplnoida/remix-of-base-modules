
-- ============================================================
-- Phase 2 — Additive schema for the unified document lifecycle
-- ============================================================

-- 1. ip_documents — add finalized-doc tracking + DMS state
ALTER TABLE public.ip_documents
  ADD COLUMN IF NOT EXISTS doc_code                    varchar(10),
  ADD COLUMN IF NOT EXISTS source_document_id          varchar(64),
  ADD COLUMN IF NOT EXISTS application_reference_number varchar(50),
  ADD COLUMN IF NOT EXISTS is_active                   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS transfer_status             varchar(20) NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS transfer_error              text,
  ADD COLUMN IF NOT EXISTS dms_document_id             varchar(64),
  ADD COLUMN IF NOT EXISTS dms_uploaded_at             timestamptz;

CREATE INDEX IF NOT EXISTS idx_ip_documents_app_ref
  ON public.ip_documents(application_reference_number);

CREATE INDEX IF NOT EXISTS idx_ip_documents_transfer_status
  ON public.ip_documents(transfer_status) WHERE transfer_status <> 'Transferred';

-- 2. ip_application_documents — versioning + active flag
ALTER TABLE public.ip_application_documents
  ADD COLUMN IF NOT EXISTS version   int     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_ip_app_docs_active
  ON public.ip_application_documents(application_reference_number, is_active)
  WHERE is_active = true AND is_deleted = false;

-- 3. er_application_documents — mirror columns (no-op if already present)
ALTER TABLE public.er_application_documents
  ADD COLUMN IF NOT EXISTS version   int     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 4. dms_transfer_queue
CREATE TABLE IF NOT EXISTS public.dms_transfer_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope           varchar(2) NOT NULL CHECK (scope IN ('ip','er')),
  document_id     uuid NOT NULL,
  ssn             varchar(6),
  regno           varchar(20),
  attempts        int  NOT NULL DEFAULT 0,
  max_attempts    int  NOT NULL DEFAULT 5,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error      text,
  status          varchar(20) NOT NULL DEFAULT 'Pending',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dms_queue_pending
  ON public.dms_transfer_queue(next_attempt_at)
  WHERE status = 'Pending';

CREATE UNIQUE INDEX IF NOT EXISTS uq_dms_queue_doc
  ON public.dms_transfer_queue(scope, document_id);

-- 5. Update resolver to filter on is_active
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
  v_replaced_or_deleted_ids text[];
  v_filtered_external jsonb;
  v_active_overrides jsonb;
BEGIN
  SELECT COALESCE(array_agg(DISTINCT source_document_id), ARRAY[]::text[])
    INTO v_replaced_or_deleted_ids
    FROM public.ip_application_documents
   WHERE application_reference_number = p_application_reference
     AND source_document_id IS NOT NULL
     AND (is_active = true OR is_deleted = true);

  SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) INTO v_filtered_external
  FROM jsonb_array_elements(COALESCE(p_external_docs, '[]'::jsonb)) d
  WHERE NOT ( (d->>'id') = ANY(v_replaced_or_deleted_ids) );

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', id,
           'source_document_id', source_document_id,
           'document_name', document_name,
           'document_type', document_type,
           'doc_code', metadata->>'doc_code',
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
           'version', version,
           'source', 'override'
         )), '[]'::jsonb)
    INTO v_active_overrides
    FROM public.ip_application_documents
   WHERE application_reference_number = p_application_reference
     AND is_active = true
     AND is_deleted = false
     AND COALESCE(file_path, url, '') <> '';

  RETURN jsonb_build_object(
    'external',  v_filtered_external,
    'overrides', v_active_overrides,
    'merged',    v_filtered_external || v_active_overrides
  );
END;
$$;

-- 6. Update ip_app_doc_upsert: increment version, deactivate previous active row
CREATE OR REPLACE FUNCTION public.ip_app_doc_upsert(
  p_application_reference text,
  p_source_document_id    text,
  p_file_meta             jsonb,
  p_user_id               uuid,
  p_user_code             text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id      uuid;
  v_ssn     varchar(6);
  v_version int := 1;
BEGIN
  IF p_application_reference IS NULL OR length(trim(p_application_reference)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED: application_reference is required';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: p_user_id is required';
  END IF;

  SELECT ssn INTO v_ssn FROM public.ip_master
   WHERE application_id = p_application_reference OR application_id::text = p_application_reference
   LIMIT 1;

  IF v_ssn IS NULL THEN
    v_ssn := UPPER(LPAD(RIGHT(regexp_replace(p_application_reference, '[^A-Za-z0-9]', '', 'g'), 6), 6, '0'));
  END IF;

  -- Compute next version and deactivate previous active row(s) for the same source_document_id
  IF p_source_document_id IS NOT NULL THEN
    SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
      FROM public.ip_application_documents
     WHERE application_reference_number = p_application_reference
       AND source_document_id = p_source_document_id;

    UPDATE public.ip_application_documents
       SET is_active = false
     WHERE application_reference_number = p_application_reference
       AND source_document_id = p_source_document_id
       AND is_active = true;
  END IF;

  INSERT INTO public.ip_application_documents (
    ssn, application_reference_number, document_name, document_type, file_name,
    file_path, url, mime_type, file_size, uploaded_at, source_document_id,
    verification_category, supportive_doc_type, is_supportive, metadata,
    created_by, uploaded_by, is_deleted, version, is_active
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
    p_user_id, p_user_id, false, v_version, true
  )
  RETURNING id INTO v_id;

  INSERT INTO public.ip_audit_log (table_name, record_id, action, changed_by, new_value, field_name)
  VALUES ('ip_application_documents', v_id::text,
          CASE WHEN p_source_document_id IS NULL THEN 'DOC_UPLOAD' ELSE 'DOC_REPLACE' END,
          p_user_id, p_file_meta->>'file_name', 'file_name');

  RETURN v_id;
END;
$$;

-- 7. AFTER INSERT trigger on ip_documents → enqueue DMS transfer
CREATE OR REPLACE FUNCTION public.ip_documents_enqueue_dms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true
     AND COALESCE(NEW.transfer_status, 'Pending') = 'Pending'
     AND COALESCE(NEW.file_path, '') <> '' THEN
    INSERT INTO public.dms_transfer_queue (scope, document_id, ssn)
    VALUES ('ip', NEW.id, NEW.ssn)
    ON CONFLICT (scope, document_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ip_documents_enqueue_dms ON public.ip_documents;
CREATE TRIGGER trg_ip_documents_enqueue_dms
AFTER INSERT ON public.ip_documents
FOR EACH ROW
EXECUTE FUNCTION public.ip_documents_enqueue_dms();

-- Drop the broken pre-doc-mirror trigger from Phase 1 — replaced by inline mirror in convert_application_atomic
DROP TRIGGER IF EXISTS trg_ip_master_post_insert_mirror_docs ON public.ip_master;
