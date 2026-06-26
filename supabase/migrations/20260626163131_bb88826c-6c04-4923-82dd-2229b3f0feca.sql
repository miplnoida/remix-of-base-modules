
-- 1. Create Department Master
CREATE TABLE IF NOT EXISTS public.core_department (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.core_organization(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_department TO authenticated;
GRANT ALL ON public.core_department TO service_role;

CREATE TRIGGER trg_core_department_updated_at
  BEFORE UPDATE ON public.core_department
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Backfill master from existing profile rows
INSERT INTO public.core_department (organization_id, code, name, is_active)
SELECT organization_id, department_code, department_name, (status = 'ACTIVE')
FROM public.core_department_profile
WHERE department_code IS NOT NULL
ON CONFLICT (organization_id, code) DO NOTHING;

-- 3. Add FK on profile to master
ALTER TABLE public.core_department_profile
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.core_department(id) ON DELETE CASCADE;

UPDATE public.core_department_profile p
SET department_id = d.id
FROM public.core_department d
WHERE d.organization_id = p.organization_id
  AND d.code = p.department_code
  AND p.department_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_core_department_profile_department_id
  ON public.core_department_profile(department_id)
  WHERE department_id IS NOT NULL;

-- 4. Auto-create profile when a department is added to master
CREATE OR REPLACE FUNCTION public.tg_autocreate_dept_profile_from_master()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.core_department_profile (
    department_id,
    organization_id,
    department_code,
    department_name,
    module_code,
    status,
    inherit_letterhead_from_org,
    inherit_email_signature_from_org,
    inherit_disclaimer_from_org,
    inherit_print_footer_from_org,
    inherit_logo_from_org,
    inherit_seal_from_org,
    inherit_location_from_org,
    inherit_dms_folder_from_org
  ) VALUES (
    NEW.id, NEW.organization_id, NEW.code, NEW.name, NEW.code,
    CASE WHEN NEW.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END,
    true,true,true,true,true,true,true,true
  )
  ON CONFLICT (department_id) WHERE department_id IS NOT NULL DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_core_department_autocreate_profile ON public.core_department;
CREATE TRIGGER trg_core_department_autocreate_profile
  AFTER INSERT ON public.core_department
  FOR EACH ROW EXECUTE FUNCTION public.tg_autocreate_dept_profile_from_master();

-- 5. Helpful index for resolver lookups
CREATE INDEX IF NOT EXISTS ix_core_department_org_active
  ON public.core_department(organization_id, is_active);

COMMENT ON COLUMN public.core_department_profile.department_code IS 'DEPRECATED: use department_id -> core_department.code';
COMMENT ON COLUMN public.core_department_profile.department_name IS 'DEPRECATED: use department_id -> core_department.name';
