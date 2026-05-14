-- Add status columns to ip_application_documents for per-document verification status tracking
ALTER TABLE public.ip_application_documents
  ADD COLUMN IF NOT EXISTS birth_status character varying(50) NULL,
  ADD COLUMN IF NOT EXISTS name_status character varying(50) NULL,
  ADD COLUMN IF NOT EXISTS marital_status character varying(50) NULL,
  ADD COLUMN IF NOT EXISTS death_status character varying(50) NULL;

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_ip_app_docs_birth_status ON public.ip_application_documents(birth_status) WHERE birth_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ip_app_docs_name_status ON public.ip_application_documents(name_status) WHERE name_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ip_app_docs_marital_status ON public.ip_application_documents(marital_status) WHERE marital_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ip_app_docs_death_status ON public.ip_application_documents(death_status) WHERE death_status IS NOT NULL;