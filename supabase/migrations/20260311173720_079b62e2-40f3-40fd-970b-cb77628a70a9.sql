ALTER TABLE public.module_doc_configs 
ADD COLUMN supportive_docs_rule TEXT NOT NULL DEFAULT 'all_required' 
CHECK (supportive_docs_rule IN ('all_required', 'any_one_required'));