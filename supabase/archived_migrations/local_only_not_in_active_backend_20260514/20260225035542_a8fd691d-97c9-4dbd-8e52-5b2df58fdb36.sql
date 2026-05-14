-- Add verification_type column to ip_application_documents
ALTER TABLE public.ip_application_documents 
ADD COLUMN IF NOT EXISTS verification_type character varying(100) NULL;

-- Add index for querying by verification_type
CREATE INDEX IF NOT EXISTS idx_ip_application_documents_verification_type 
ON public.ip_application_documents(verification_type);

COMMENT ON COLUMN public.ip_application_documents.verification_type IS 'Verification type code from external API, maps to tb_verify for IP registration document requirements';