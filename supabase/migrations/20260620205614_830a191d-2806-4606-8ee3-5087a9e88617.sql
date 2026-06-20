
ALTER TABLE public.core_template DROP CONSTRAINT IF EXISTS core_template_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS core_template_code_scope_country_uk
  ON public.core_template (code, scope, country_code);
