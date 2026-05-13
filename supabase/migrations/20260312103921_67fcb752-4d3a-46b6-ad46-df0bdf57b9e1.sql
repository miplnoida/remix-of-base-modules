
ALTER TABLE public.ia_departments
  ADD COLUMN IF NOT EXISTS office_code TEXT,
  ADD COLUMN IF NOT EXISTS source_department_id UUID,
  ADD COLUMN IF NOT EXISTS head_profile_id UUID;
