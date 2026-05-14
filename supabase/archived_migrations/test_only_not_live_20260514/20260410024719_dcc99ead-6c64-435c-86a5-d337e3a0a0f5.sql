ALTER TABLE public.app_modules
  ADD COLUMN IF NOT EXISTS base_url text DEFAULT NULL;

COMMENT ON COLUMN public.app_modules.base_url IS
  'External host URL for cross-app modules (e.g. https://other-app.lovable.app). NULL = local route.';