ALTER TABLE public.ip_documents
  ADD COLUMN IF NOT EXISTS file_name         text,
  ADD COLUMN IF NOT EXISTS verification_type text,
  ADD COLUMN IF NOT EXISTS metadata          jsonb;

ALTER TABLE public.ip_documents
  ALTER COLUMN file_size TYPE bigint USING file_size::bigint;

COMMENT ON COLUMN public.ip_documents.file_name IS
  'Original filename of the uploaded document (mirrored from ip_application_documents).';
COMMENT ON COLUMN public.ip_documents.verification_type IS
  'Free-form verification type metadata mirrored from ip_application_documents (no whitelist).';
COMMENT ON COLUMN public.ip_documents.metadata IS
  'Free-form JSON metadata mirrored from ip_application_documents.';
