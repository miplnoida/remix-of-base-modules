
-- Enterprise Organization Management foundation
-- 1) Module profile (1:1 with app_modules)
CREATE TABLE IF NOT EXISTS public.core_module_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL UNIQUE REFERENCES public.app_modules(id) ON DELETE CASCADE,
  module_code text NOT NULL UNIQUE,
  owner_department_id uuid,
  default_workbasket_id uuid,
  default_dms_folder_id text,
  default_notification_category text,
  override_letterhead_id uuid,
  override_email_signature_id uuid,
  override_disclaimer_id uuid,
  override_print_footer_id uuid,
  override_logo_asset_id uuid,
  override_seal_asset_id uuid,
  inherit_letterhead_from_org boolean NOT NULL DEFAULT true,
  inherit_email_signature_from_org boolean NOT NULL DEFAULT true,
  inherit_disclaimer_from_org boolean NOT NULL DEFAULT true,
  inherit_print_footer_from_org boolean NOT NULL DEFAULT true,
  inherit_logo_from_org boolean NOT NULL DEFAULT true,
  inherit_seal_from_org boolean NOT NULL DEFAULT true,
  ai_context_notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_module_profile TO authenticated;
GRANT ALL ON public.core_module_profile TO service_role;

-- 2) Scoped, prioritised asset assignment
CREATE TABLE IF NOT EXISTS public.comm_asset_assignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL,
  asset_type text NOT NULL,
  scope_type text NOT NULL CHECK (scope_type IN ('ORGANIZATION','DEPARTMENT','MODULE','TEMPLATE','LOCATION','DOCUMENT_TYPE')),
  scope_id text NOT NULL,
  language text,
  priority integer NOT NULL DEFAULT 100,
  is_default boolean NOT NULL DEFAULT false,
  effective_from date,
  effective_to date,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text
);
CREATE INDEX IF NOT EXISTS ix_caa_scope ON public.comm_asset_assignment (scope_type, scope_id, asset_type, active);
CREATE INDEX IF NOT EXISTS ix_caa_asset ON public.comm_asset_assignment (asset_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comm_asset_assignment TO authenticated;
GRANT ALL ON public.comm_asset_assignment TO service_role;

-- 3) Auto-create module profile rows on app_modules insert
CREATE OR REPLACE FUNCTION public.ensure_module_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.core_module_profile (module_id, module_code)
  VALUES (NEW.id, NEW.name)
  ON CONFLICT (module_id) DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_ensure_module_profile ON public.app_modules;
CREATE TRIGGER trg_ensure_module_profile AFTER INSERT ON public.app_modules
FOR EACH ROW EXECUTE FUNCTION public.ensure_module_profile();

-- 4) updated_at touch
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_cmp_touch ON public.core_module_profile;
CREATE TRIGGER trg_cmp_touch BEFORE UPDATE ON public.core_module_profile
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_caa_touch ON public.comm_asset_assignment;
CREATE TRIGGER trg_caa_touch BEFORE UPDATE ON public.comm_asset_assignment
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5) Backfill module profiles for existing modules
INSERT INTO public.core_module_profile (module_id, module_code, owner_department_id)
SELECT m.id, m.name, m.owner_department_id
FROM public.app_modules m
ON CONFLICT (module_id) DO NOTHING;
