
-- Drop existing view that depends on old columns
DROP VIEW IF EXISTS public.ce_inspector_profiles;

-- Drop redundant columns
ALTER TABLE public.ce_inspectors
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS assigned_zones,
  DROP COLUMN IF EXISTS is_primary,
  DROP COLUMN IF EXISTS active_from,
  DROP COLUMN IF EXISTS designation_id;

-- Add new compliance-specific columns
ALTER TABLE public.ce_inspectors
  ADD COLUMN IF NOT EXISTS primary_zone_id UUID REFERENCES public.ce_zones(id),
  ADD COLUMN IF NOT EXISTS can_handle_review BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_handle_legal BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS office_code VARCHAR(10);

-- Ensure profile_id is unique
ALTER TABLE public.ce_inspectors
  DROP CONSTRAINT IF EXISTS ce_inspectors_profile_id_key;

ALTER TABLE public.ce_inspectors
  ADD CONSTRAINT ce_inspectors_profile_id_key UNIQUE (profile_id);

-- Recreate consolidated view
CREATE OR REPLACE VIEW public.ce_inspector_profiles AS
SELECT
  ci.id AS inspector_id,
  ci.inspector_code,
  ci.profile_id,
  ci.legacy_inspector_code,
  ci.supervisor_id,
  ci.primary_zone_id,
  ci.max_caseload,
  ci.can_handle_review,
  ci.can_handle_legal,
  ci.is_active,
  ci.office_code AS inspector_office_code,
  ci.created_at,
  ci.updated_at,
  p.first_name,
  p.last_name,
  p.full_name,
  p.email,
  p.phone,
  p.user_code,
  p.office_code AS profile_office_code,
  p.designation_id,
  p.reporting_to_user_id,
  z.zone_code,
  z.zone_name,
  d.description AS designation_name,
  ti.insp_name AS legacy_inspector_name,
  sup_p.full_name AS supervisor_name
FROM public.ce_inspectors ci
LEFT JOIN public.profiles p ON p.id = ci.profile_id
LEFT JOIN public.ce_zones z ON z.id = ci.primary_zone_id
LEFT JOIN public.tb_designations d ON d.id = p.designation_id
LEFT JOIN public.tb_inspector ti ON ti.code = ci.legacy_inspector_code
LEFT JOIN public.ce_inspectors sup ON sup.id = ci.supervisor_id
LEFT JOIN public.profiles sup_p ON sup_p.id = sup.profile_id;
