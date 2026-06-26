
-- 1. Delete corrupt row
DELETE FROM public.core_department_profile
WHERE module_code='LEGAL' AND department_code LIKE 'AAAA%';

-- 2. Organization defaults
ALTER TABLE public.core_organization
  ADD COLUMN IF NOT EXISTS default_letterhead_id      uuid REFERENCES public.comm_letterhead(id)      ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_email_signature_id uuid REFERENCES public.comm_email_signature(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_disclaimer_id      uuid REFERENCES public.comm_disclaimer(id)      ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_print_footer_id    uuid REFERENCES public.comm_print_footer(id)    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_location_id        uuid REFERENCES public.office_locations(id)     ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_dms_folder_id      text,
  ADD COLUMN IF NOT EXISTS default_logo_asset_id      text,
  ADD COLUMN IF NOT EXISTS default_seal_asset_id      text;

-- 3. Department profile inheritance + overrides
ALTER TABLE public.core_department_profile
  ADD COLUMN IF NOT EXISTS inherit_letterhead_from_org      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inherit_email_signature_from_org boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inherit_disclaimer_from_org      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inherit_print_footer_from_org    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inherit_location_from_org        boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inherit_dms_folder_from_org      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inherit_logo_from_org            boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inherit_seal_from_org            boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS override_logo_asset_id           text,
  ADD COLUMN IF NOT EXISTS override_seal_asset_id           text,
  ADD COLUMN IF NOT EXISTS contact_email                    text,
  ADD COLUMN IF NOT EXISTS contact_phone                    text,
  ADD COLUMN IF NOT EXISTS active_location_ids              jsonb,
  ADD COLUMN IF NOT EXISTS dms_folder_id                    text;

-- 4. Existing non-null default_*_id values become overrides → flip inherit flag false
UPDATE public.core_department_profile SET inherit_letterhead_from_org      = false WHERE default_letterhead_id      IS NOT NULL;
UPDATE public.core_department_profile SET inherit_email_signature_from_org = false WHERE default_email_signature_id IS NOT NULL;
UPDATE public.core_department_profile SET inherit_disclaimer_from_org      = false WHERE default_disclaimer_id      IS NOT NULL;
UPDATE public.core_department_profile SET inherit_print_footer_from_org    = false WHERE default_print_footer_id    IS NOT NULL;
UPDATE public.core_department_profile SET inherit_location_from_org        = false WHERE primary_location_id        IS NOT NULL;

-- 5. Seed organization defaults from SEED standard assets + primary location
UPDATE public.core_organization o SET
  default_letterhead_id      = COALESCE(o.default_letterhead_id,      (SELECT id FROM public.comm_letterhead      WHERE name ILIKE 'SEED%Standard%' AND is_active ORDER BY created_at LIMIT 1)),
  default_email_signature_id = COALESCE(o.default_email_signature_id, (SELECT id FROM public.comm_email_signature WHERE name ILIKE 'SEED%Standard%' AND is_active ORDER BY created_at LIMIT 1)),
  default_disclaimer_id      = COALESCE(o.default_disclaimer_id,      (SELECT id FROM public.comm_disclaimer      WHERE name ILIKE 'SEED%Standard%' AND is_active ORDER BY created_at LIMIT 1)),
  default_print_footer_id    = COALESCE(o.default_print_footer_id,    (SELECT id FROM public.comm_print_footer    WHERE name ILIKE 'SEED%Standard%' AND is_active ORDER BY created_at LIMIT 1)),
  default_location_id        = COALESCE(o.default_location_id,        (SELECT id FROM public.office_locations     WHERE is_primary AND is_active ORDER BY branch_name LIMIT 1))
WHERE o.org_code = 'SKN-SSB';

-- 6. Auto-create department profile when a module is inserted
CREATE OR REPLACE FUNCTION public.tg_autocreate_department_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
BEGIN
  IF NEW.name IS NULL OR NEW.parent_id IS NOT NULL THEN
    RETURN NEW;  -- only top-level modules get an auto profile
  END IF;
  SELECT id INTO v_org FROM public.core_organization ORDER BY created_at LIMIT 1;
  IF v_org IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.core_department_profile
    (organization_id, module_code, department_code, department_name, status,
     inherit_letterhead_from_org, inherit_email_signature_from_org,
     inherit_disclaimer_from_org, inherit_print_footer_from_org,
     inherit_location_from_org, inherit_dms_folder_from_org,
     inherit_logo_from_org, inherit_seal_from_org)
  VALUES
    (v_org, NEW.name, NEW.name, COALESCE(NEW.display_name, NEW.name), 'ACTIVE',
     true, true, true, true, true, true, true, true)
  ON CONFLICT (module_code, department_code) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_modules_autocreate_dept_profile ON public.app_modules;
CREATE TRIGGER trg_app_modules_autocreate_dept_profile
  AFTER INSERT ON public.app_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_autocreate_department_profile();

-- 7. Backfill: ensure a profile exists for every active top-level module
INSERT INTO public.core_department_profile
  (organization_id, module_code, department_code, department_name, status,
   inherit_letterhead_from_org, inherit_email_signature_from_org,
   inherit_disclaimer_from_org, inherit_print_footer_from_org,
   inherit_location_from_org, inherit_dms_folder_from_org,
   inherit_logo_from_org, inherit_seal_from_org)
SELECT
  (SELECT id FROM public.core_organization ORDER BY created_at LIMIT 1),
  m.name, m.name, COALESCE(m.display_name, m.name), 'ACTIVE',
  true, true, true, true, true, true, true, true
FROM public.app_modules m
WHERE m.parent_id IS NULL
  AND m.is_enabled = true
  AND m.name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.core_department_profile p
    WHERE p.module_code = m.name AND p.department_code = m.name
  );
