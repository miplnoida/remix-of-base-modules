
-- Create er_application_documents table for document transfer during conversion
CREATE TABLE public.er_application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regno VARCHAR(6) NOT NULL,
  source_application_reference TEXT NOT NULL,
  doc_code VARCHAR(20),
  document_type VARCHAR(100),
  document_description TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  uploaded_by VARCHAR(50),
  uploaded_by_code VARCHAR(50),
  transferred_at TIMESTAMPTZ DEFAULT now(),
  transferred_by VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_er_app_docs_regno ON public.er_application_documents(regno);
CREATE INDEX idx_er_app_docs_source ON public.er_application_documents(source_application_reference);

-- Ensure employer-documents storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('employer-documents', 'employer-documents', true)
ON CONFLICT (id) DO NOTHING;
