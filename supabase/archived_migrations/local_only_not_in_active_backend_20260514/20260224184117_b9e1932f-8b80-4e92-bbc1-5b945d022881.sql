
-- Add verification_category and supportive_doc_type to ip_documents
ALTER TABLE public.ip_documents 
ADD COLUMN IF NOT EXISTS verification_category text,
ADD COLUMN IF NOT EXISTS supportive_doc_type text,
ADD COLUMN IF NOT EXISTS is_supportive boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.ip_documents.verification_category IS 'Which verification this doc belongs to: birth, name, marital, death';
COMMENT ON COLUMN public.ip_documents.supportive_doc_type IS 'Code from tb_verify if this is a supportive document for a main document';
COMMENT ON COLUMN public.ip_documents.is_supportive IS 'Whether this is a supportive document linked to a main document';
