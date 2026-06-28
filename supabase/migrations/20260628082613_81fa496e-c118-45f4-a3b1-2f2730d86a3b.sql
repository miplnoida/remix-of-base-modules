
CREATE UNIQUE INDEX IF NOT EXISTS uq_app_modules_parent_name_enabled
  ON public.app_modules (parent_id, name)
  WHERE is_enabled = true;
