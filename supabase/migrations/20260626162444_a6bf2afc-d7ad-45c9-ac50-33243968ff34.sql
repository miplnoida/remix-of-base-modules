
-- 1. Drop the bad auto-create trigger and function
DROP TRIGGER IF EXISTS trg_app_modules_autocreate_dept_profile ON public.app_modules;
DROP FUNCTION IF EXISTS public.tg_autocreate_department_profile();

-- 2. Define the canonical set of real departments
WITH canonical(code) AS (
  VALUES ('LEGAL'),('FINANCE'),('BENEFITS'),('COMPLIANCE'),('HUMAN_RESOURCES'),
         ('INFORMATION_TECHNOLOGY'),('EMPLOYER_SERVICES'),('CUSTOMER_SERVICE'),
         ('EXECUTIVE_OFFICE'),('BOARD_SECRETARIAT'),('INTERNAL_AUDIT'),
         ('PROCUREMENT'),('RECORDS_DMS'),('REGISTRATION')
)
-- 3. Delete all profile rows whose department_code is NOT in the canonical list
DELETE FROM public.core_department_profile
WHERE department_code NOT IN (SELECT code FROM canonical);

-- 4. Align module_code to department_code for the surviving rows
UPDATE public.core_department_profile
SET module_code = department_code
WHERE module_code <> department_code;

-- 5. Add unique constraint on department_code per organization to prevent re-duplication
CREATE UNIQUE INDEX IF NOT EXISTS ux_core_department_profile_org_dept
  ON public.core_department_profile(organization_id, department_code);

-- 6. Create the module → department mapping table
CREATE TABLE IF NOT EXISTS public.core_module_department_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code TEXT NOT NULL UNIQUE,
  department_code TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_module_department_map TO authenticated;
GRANT ALL ON public.core_module_department_map TO service_role;

CREATE TRIGGER trg_core_module_department_map_updated_at
  BEFORE UPDATE ON public.core_module_department_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Seed sensible module → department mappings
INSERT INTO public.core_module_department_map (module_code, department_code) VALUES
  ('legal_advanced','LEGAL'),
  ('legal_enforcement','LEGAL'),
  ('benefits_management','BENEFITS'),
  ('compliance_audit','COMPLIANCE'),
  ('compliance_classic','COMPLIANCE'),
  ('employers_management','EMPLOYER_SERVICES'),
  ('online-applications','EMPLOYER_SERVICES'),
  ('insured_person_management','CUSTOMER_SERVICE'),
  ('payments','FINANCE'),
  ('c3_management','FINANCE'),
  ('cashier_and_payments','FINANCE'),
  ('internal_audit','INTERNAL_AUDIT'),
  ('quality_assurance','INTERNAL_AUDIT'),
  ('manage-meetings','BOARD_SECRETARIAT'),
  ('dashboard','INFORMATION_TECHNOLOGY'),
  ('admin_dms_api_test','INFORMATION_TECHNOLOGY'),
  ('Administration','EXECUTIVE_OFFICE')
ON CONFLICT (module_code) DO UPDATE SET department_code = EXCLUDED.department_code;
