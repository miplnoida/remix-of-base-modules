ALTER TABLE public.core_generated_document
  ADD COLUMN IF NOT EXISTS dms_document_id text,
  ADD COLUMN IF NOT EXISTS dms_file_id text,
  ADD COLUMN IF NOT EXISTS dms_url text,
  ADD COLUMN IF NOT EXISTS dms_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS dms_upload_status text NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS dms_upload_error text;

CREATE INDEX IF NOT EXISTS idx_core_generated_document_dms ON public.core_generated_document(dms_document_id);
CREATE INDEX IF NOT EXISTS idx_core_generated_document_dms_status ON public.core_generated_document(dms_upload_status);