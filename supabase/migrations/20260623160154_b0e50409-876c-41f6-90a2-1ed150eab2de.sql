
-- Storage policies on core-documents bucket (bucket itself created via storage_create_bucket)
DROP POLICY IF EXISTS "core_documents_read_authenticated" ON storage.objects;
CREATE POLICY "core_documents_read_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'core-documents');

DROP POLICY IF EXISTS "core_documents_write_authenticated" ON storage.objects;
CREATE POLICY "core_documents_write_authenticated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'core-documents');

DROP POLICY IF EXISTS "core_documents_update_authenticated" ON storage.objects;
CREATE POLICY "core_documents_update_authenticated"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'core-documents');

DROP POLICY IF EXISTS "core_documents_delete_authenticated" ON storage.objects;
CREATE POLICY "core_documents_delete_authenticated"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'core-documents');

-- Config table
CREATE TABLE IF NOT EXISTS public.core_document_storage_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'LOCAL_SUPABASE'
    CHECK (provider IN ('LOCAL_SUPABASE','CENTRAL_DMS','HYBRID')),
  local_bucket text NOT NULL DEFAULT 'core-documents',
  dms_api_setting_key text DEFAULT 'dms_service',
  dms_default_category_id text DEFAULT 'PPIP',
  dms_legal_category_id text DEFAULT 'PPIP',
  fallback_to_local boolean NOT NULL DEFAULT true,
  auto_mirror_to_central boolean NOT NULL DEFAULT false,
  retry_max integer NOT NULL DEFAULT 5,
  retry_backoff_seconds integer NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_document_storage_config TO authenticated;
GRANT ALL ON public.core_document_storage_config TO service_role;
GRANT SELECT ON public.core_document_storage_config TO anon;

ALTER TABLE public.core_document_storage_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "core_doc_storage_config_read" ON public.core_document_storage_config;
CREATE POLICY "core_doc_storage_config_read"
  ON public.core_document_storage_config FOR SELECT
  TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "core_doc_storage_config_write" ON public.core_document_storage_config;
CREATE POLICY "core_doc_storage_config_write"
  ON public.core_document_storage_config FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS core_document_storage_config_one_active
  ON public.core_document_storage_config (is_active) WHERE is_active = true;

INSERT INTO public.core_document_storage_config (provider, local_bucket, fallback_to_local, is_active, notes, updated_by)
SELECT 'LOCAL_SUPABASE', 'core-documents', true, true,
       'Default: documents stored locally until central DMS is enabled.', 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM public.core_document_storage_config WHERE is_active = true);

CREATE OR REPLACE FUNCTION public.touch_core_document_storage_config()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_touch_core_doc_storage_cfg ON public.core_document_storage_config;
CREATE TRIGGER trg_touch_core_doc_storage_cfg
  BEFORE UPDATE ON public.core_document_storage_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_core_document_storage_config();

-- Provenance columns
ALTER TABLE public.core_generated_document
  ADD COLUMN IF NOT EXISTS storage_provider text DEFAULT 'LOCAL_SUPABASE',
  ADD COLUMN IF NOT EXISTS storage_ref text,
  ADD COLUMN IF NOT EXISTS central_dms_ref text,
  ADD COLUMN IF NOT EXISTS sync_state text DEFAULT 'LOCAL_ONLY',
  ADD COLUMN IF NOT EXISTS sync_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sync_error text,
  ADD COLUMN IF NOT EXISTS synced_at timestamptz;

ALTER TABLE public.lg_document_link
  ADD COLUMN IF NOT EXISTS storage_provider text DEFAULT 'LOCAL_SUPABASE',
  ADD COLUMN IF NOT EXISTS storage_ref text,
  ADD COLUMN IF NOT EXISTS central_dms_ref text,
  ADD COLUMN IF NOT EXISTS sync_state text DEFAULT 'LOCAL_ONLY',
  ADD COLUMN IF NOT EXISTS sync_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sync_error text,
  ADD COLUMN IF NOT EXISTS synced_at timestamptz;

-- Backfill rows already in central DMS
UPDATE public.core_generated_document
   SET storage_provider = 'CENTRAL_DMS',
       central_dms_ref = dms_document_id,
       sync_state = 'SYNCED',
       synced_at = COALESCE(dms_uploaded_at, now())
 WHERE dms_document_id IS NOT NULL AND dms_upload_status = 'COMPLETE'
   AND (storage_provider IS NULL OR storage_provider = 'LOCAL_SUPABASE')
   AND storage_ref IS NULL;

UPDATE public.lg_document_link
   SET storage_provider = 'CENTRAL_DMS',
       central_dms_ref = dms_document_id,
       sync_state = 'SYNCED',
       synced_at = now()
 WHERE dms_document_id IS NOT NULL AND upload_status = 'COMPLETE'
   AND (storage_provider IS NULL OR storage_provider = 'LOCAL_SUPABASE')
   AND storage_ref IS NULL;
