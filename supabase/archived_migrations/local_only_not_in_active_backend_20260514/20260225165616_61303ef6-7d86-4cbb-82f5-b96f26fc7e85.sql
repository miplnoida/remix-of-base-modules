
-- Table to persist documents uploaded on /meetings/start/:id
-- These are merged with external API documents on load
CREATE TABLE IF NOT EXISTS public.meeting_uploaded_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  application_reference VARCHAR(100) NOT NULL,
  document_type VARCHAR(100),
  document_name VARCHAR(255),
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  storage_url TEXT NOT NULL,
  verification_category VARCHAR(20),
  is_supportive BOOLEAN DEFAULT false,
  supportive_doc_type VARCHAR(10),
  uploaded_by UUID,
  uploaded_by_code VARCHAR(50),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by meeting
CREATE INDEX IF NOT EXISTS idx_meeting_uploaded_docs_meeting_id ON public.meeting_uploaded_documents(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_uploaded_docs_app_ref ON public.meeting_uploaded_documents(application_reference);
-- Unique constraint to prevent duplicate uploads
CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_uploaded_docs_unique_path ON public.meeting_uploaded_documents(meeting_id, file_path);
