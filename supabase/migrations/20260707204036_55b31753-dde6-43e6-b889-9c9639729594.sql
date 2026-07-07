
-- OM-9.6: Location UX & Service Center definition

-- 1. Extend office_locations with Service Center fields (safe additive)
ALTER TABLE public.office_locations
  ADD COLUMN IF NOT EXISTS is_service_center boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_facing     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS services_offered  jsonb   NOT NULL DEFAULT '[]'::jsonb;

-- Back-fill: existing SERVICE_CENTER rows are service centers and public facing.
UPDATE public.office_locations
   SET is_service_center = true,
       public_facing     = true
 WHERE location_type = 'SERVICE_CENTER'
   AND (is_service_center = false OR public_facing = false);

-- 2. Audit event types (OM-9.6)
INSERT INTO public.core_audit_event_type (event_code, event_name, event_category, domain_code, is_admin_event, is_active) VALUES
  ('LOCATION_UX_STABILIZED',            'Location UX stabilized',              'ORGANIZATION','ORGANIZATION', true,  true),
  ('LOCATION_TYPE_UPDATED',             'Location type updated',               'ORGANIZATION','ORGANIZATION', true,  true),
  ('LOCATION_SERVICE_CENTER_ENABLED',   'Service center flag enabled',         'ORGANIZATION','ORGANIZATION', true,  true),
  ('LOCATION_SERVICE_CENTER_DISABLED',  'Service center flag disabled',        'ORGANIZATION','ORGANIZATION', true,  true),
  ('LOCATION_PUBLIC_FACING_UPDATED',    'Location public facing flag updated', 'ORGANIZATION','ORGANIZATION', true,  true),
  ('LOCATION_PRIMARY_UPDATED',          'Location primary flag updated',       'ORGANIZATION','ORGANIZATION', true,  true),
  ('LOCATION_SEED_VERIFIED',            'Location seed verified',              'ORGANIZATION','ORGANIZATION', true,  true),
  ('LOCATION_DIALOG_VALIDATION_FAILED', 'Location dialog validation failed',   'ORGANIZATION','ORGANIZATION', false, true),
  ('SERVICE_CENTER_DEFINITION_VERIFIED','Service center definition verified',  'ORGANIZATION','ORGANIZATION', true,  true)
ON CONFLICT (event_code) DO UPDATE
  SET is_active = true, event_name = EXCLUDED.event_name, event_category = EXCLUDED.event_category;

-- 3. Reference groups (OM-9.6)
INSERT INTO public.core_reference_group (group_code, group_name, description, is_active) VALUES
  ('SERVICE_CENTER_STATUS',  'Service Center Status',  'Whether a location is a public service center',                    true),
  ('PUBLIC_FACING_STATUS',   'Public Facing Status',   'Whether a location accepts public visitors',                       true),
  ('LOCATION_SERVICE_TYPE',  'Location Service Type',  'Employer / Insured Person / Claims / Contribution / Cashier / Doc',true)
ON CONFLICT (group_code) DO UPDATE SET is_active = true, group_name = EXCLUDED.group_name;

-- 4. Ensure friendly LOCATION_TYPE remains active with OM-9.6 vocabulary
INSERT INTO public.core_reference_group (group_code, group_name, description, is_active) VALUES
  ('LOCATION_TYPE', 'Location Type', 'HEAD_OFFICE / BRANCH / SERVICE_CENTER / BACK_OFFICE / WAREHOUSE / OTHER', true)
ON CONFLICT (group_code) DO UPDATE SET is_active = true;

-- 5. Seed: ensure at least one active Head Office exists (idempotent)
INSERT INTO public.office_locations (
  branch_name, location_type, country, island_or_region, parish_city,
  is_primary, is_active, is_service_center, public_facing
)
SELECT 'Head Office - Basseterre', 'HEAD_OFFICE', 'KN', 'Saint Kitts', 'Basseterre',
       true, true, false, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.office_locations
   WHERE is_active = true AND location_type = 'HEAD_OFFICE'
);

-- 6. Attestation
INSERT INTO public.core_release_readiness_attestation (release_tag, check_code, attested_status, notes, attested_by, attested_at, is_active)
SELECT 'OM-9.6', 'LOCATION_UX_STABILIZED', 'ATTESTED',
       'OM-9.6: Location dialog re-organised into tabs with sticky footer; Service Center fields added; canonical service exposes service-center helpers; audit + reference vocabulary registered.',
       NULL::uuid, now(), true
WHERE NOT EXISTS (
  SELECT 1 FROM public.core_release_readiness_attestation
  WHERE release_tag='OM-9.6' AND check_code='LOCATION_UX_STABILIZED'
);
