
-- Create child documents table for supportive and alternate documents
CREATE TABLE public.module_doc_child_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_config_id UUID NOT NULL REFERENCES public.module_doc_configs(id) ON DELETE CASCADE,
  parent_alternate_id UUID REFERENCES public.module_doc_child_docs(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('supportive', 'alternate')),
  document_name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT false,
  allowed_extensions TEXT[] DEFAULT '{pdf,jpg,png}',
  max_file_size_mb NUMERIC DEFAULT 5,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- Index for fast lookups
CREATE INDEX idx_child_docs_parent_config ON public.module_doc_child_docs(parent_config_id);
CREATE INDEX idx_child_docs_parent_alternate ON public.module_doc_child_docs(parent_alternate_id);
