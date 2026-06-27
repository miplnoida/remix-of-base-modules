
-- 1) Additive columns on app_modules
ALTER TABLE public.app_modules
  ADD COLUMN IF NOT EXISTS short_name TEXT,
  ADD COLUMN IF NOT EXISTS owner_department_id UUID REFERENCES public.core_department(id) ON DELETE SET NULL;

-- 2) New core_text_block table
CREATE TABLE IF NOT EXISTS public.core_text_block (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_block_code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  module_code TEXT,
  department_code TEXT,
  language_code TEXT NOT NULL DEFAULT 'en',
  version_no INTEGER NOT NULL DEFAULT 1,
  content_html TEXT,
  content_text TEXT,
  effective_from DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT,
  CONSTRAINT core_text_block_code_lang_ver_uniq UNIQUE (text_block_code, language_code, version_no)
);

CREATE INDEX IF NOT EXISTS idx_core_text_block_lookup
  ON public.core_text_block (text_block_code, language_code, is_active);
CREATE INDEX IF NOT EXISTS idx_core_text_block_module
  ON public.core_text_block (module_code) WHERE module_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_text_block_department
  ON public.core_text_block (department_code) WHERE department_code IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_text_block TO authenticated;
GRANT ALL ON public.core_text_block TO service_role;

-- NOTE: Per project architecture (NO-RLS in public schema), RLS is NOT enabled.
-- Auth/authorization is enforced at the application & edge-function layer.

-- 3) updated_at trigger (reuse standard function if present, else create)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_core_text_block_updated_at ON public.core_text_block;
CREATE TRIGGER update_core_text_block_updated_at
  BEFORE UPDATE ON public.core_text_block
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
