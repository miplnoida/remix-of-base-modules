
-- Add supportive doc parameters
ALTER TABLE public.module_doc_configs
  ADD COLUMN IF NOT EXISTS supportive_allowed_extensions TEXT[] DEFAULT '{pdf,jpg,png}',
  ADD COLUMN IF NOT EXISTS supportive_max_file_size_mb NUMERIC DEFAULT 5;

-- Add alternate doc parameters
ALTER TABLE public.module_doc_configs
  ADD COLUMN IF NOT EXISTS alternate_allowed_extensions TEXT[] DEFAULT '{pdf,jpg,png}',
  ADD COLUMN IF NOT EXISTS alternate_max_file_size_mb NUMERIC DEFAULT 5;

-- Add alternate supportive doc parameters
ALTER TABLE public.module_doc_configs
  ADD COLUMN IF NOT EXISTS alternate_supportive_allowed_extensions TEXT[] DEFAULT '{pdf,jpg,png}',
  ADD COLUMN IF NOT EXISTS alternate_supportive_max_file_size_mb NUMERIC DEFAULT 5;
