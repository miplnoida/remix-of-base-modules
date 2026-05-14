
-- Add is_active flag for soft-delete/deactivation of replaced documents
ALTER TABLE public.meeting_uploaded_documents
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add doc_code to store the tb_verify code (e.g. 'P', 'B', 'A', 'I') for the document
ALTER TABLE public.meeting_uploaded_documents
  ADD COLUMN IF NOT EXISTS doc_code text;

-- Add replaced_by to link to the replacement document
ALTER TABLE public.meeting_uploaded_documents
  ADD COLUMN IF NOT EXISTS replaced_by uuid REFERENCES public.meeting_uploaded_documents(id);

-- Add replaced_at timestamp
ALTER TABLE public.meeting_uploaded_documents
  ADD COLUMN IF NOT EXISTS replaced_at timestamptz;

-- Index for efficient filtering of active documents
CREATE INDEX IF NOT EXISTS idx_meeting_docs_active 
  ON public.meeting_uploaded_documents(meeting_id, verification_category, is_active) 
  WHERE is_active = true;

-- Comment for documentation
COMMENT ON COLUMN public.meeting_uploaded_documents.is_active IS 'Soft-delete flag. False means this document was replaced by a newer upload for the same verification category.';
COMMENT ON COLUMN public.meeting_uploaded_documents.doc_code IS 'The tb_verify code (e.g. P=Passport, B=Birth Certificate, A=Affidavit) for this document.';
