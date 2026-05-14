
-- Document Configuration tables for managing required documents by module

CREATE TABLE public.module_doc_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.app_modules(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT,
  UNIQUE (module_id, category_name)
);

CREATE TABLE public.module_doc_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.module_doc_categories(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  allowed_extensions TEXT[] DEFAULT '{pdf,jpg,png}',
  max_file_size_mb NUMERIC DEFAULT 5,
  requires_supportive_doc BOOLEAN DEFAULT false,
  supportive_doc_description TEXT,
  allow_alternate_doc BOOLEAN DEFAULT false,
  alternate_doc_name TEXT,
  alternate_requires_supportive BOOLEAN DEFAULT false,
  alternate_supportive_description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT,
  UNIQUE (category_id, document_name)
);

-- Indexes for performance
CREATE INDEX idx_module_doc_categories_module_id ON public.module_doc_categories(module_id);
CREATE INDEX idx_module_doc_configs_category_id ON public.module_doc_configs(category_id);

-- Insert API registry entry for the public endpoint
INSERT INTO public.api_registry (
  api_name, endpoint_path, http_method, api_version, description, is_enabled, requires_auth, category, sort_order
) VALUES (
  'Module Document Configuration',
  '/api/v1/module-documents',
  'GET',
  'v1',
  'Retrieve configured required documents for a module by identifier. Pass module name as query param: ?module=module_name',
  true,
  true,
  'Configuration',
  50
);
