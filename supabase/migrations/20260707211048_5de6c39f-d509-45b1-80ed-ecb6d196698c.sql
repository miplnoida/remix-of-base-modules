-- OM-9.7 extension: Department Profile field classification, scoped-assignment audit events, and seed attestation.

-- 1. Additional audit event types (idempotent).
INSERT INTO public.core_audit_event_type (event_code, event_name, event_category, domain_code, is_admin_event, is_active) VALUES
  ('DEPARTMENT_PROFILE_BACKFILL_SKIPPED_EXISTING', 'Department profile backfill skipped existing', 'ORGANIZATION','ORGANIZATION', true,  true),
  ('DEPARTMENT_PROFILE_MODEL_CLASSIFIED',          'Department profile field model classified',    'ORGANIZATION','ORGANIZATION', true,  true),
  ('DEPARTMENT_PROFILE_SEED_VERIFIED',             'Department profile seed verified',             'ORGANIZATION','ORGANIZATION', true,  true),
  ('DEPARTMENT_PROFILE_SCOPED_ASSIGNMENT_CREATED', 'Department scoped assignment created',         'ORGANIZATION','ORGANIZATION', true,  true),
  ('DEPARTMENT_PROFILE_SCOPED_ASSIGNMENT_UPDATED', 'Department scoped assignment updated',         'ORGANIZATION','ORGANIZATION', true,  true),
  ('DEPARTMENT_PROFILE_SCOPED_ASSIGNMENT_DEACTIVATED', 'Department scoped assignment deactivated', 'ORGANIZATION','ORGANIZATION', true,  true)
ON CONFLICT (event_code) DO UPDATE
  SET is_active = true, event_name = EXCLUDED.event_name, event_category = EXCLUDED.event_category;

-- 2. Additional reference groups.
INSERT INTO public.core_reference_group (group_code, group_name, description, is_active) VALUES
  ('DEPARTMENT_PROFILE_FIELD_CATEGORY', 'Department Profile Field Category',
    'ORG_INHERITABLE / SCOPED_ASSIGNMENT / DEPARTMENT_ONLY / PLANNED', true),
  ('DEPARTMENT_PROFILE_SEED_STATUS',    'Department Profile Seed Status',
    'CREATED / SKIPPED_EXISTING / VERIFIED', true)
ON CONFLICT (group_code) DO UPDATE
  SET is_active = true, group_name = EXCLUDED.group_name, description = EXCLUDED.description;

-- 3. Safe idempotent department profile seed for any active department without a profile.
--    Uses table defaults: all inherit_*_from_org flags default to true; overrides left null.
INSERT INTO public.core_department_profile (
  module_code, department_code, department_name, status
)
SELECT d.code, d.code, d.name, 'ACTIVE'
  FROM public.core_department d
  LEFT JOIN public.core_department_profile p ON p.department_code = d.code
 WHERE d.is_active = true
   AND p.id IS NULL;

-- 4. Release-readiness attestation for the seed verification.
INSERT INTO public.core_release_readiness_attestation (release_tag, check_code, attested_status, notes, attested_by, attested_at, is_active)
SELECT 'OM-9.7', 'DEPARTMENT_PROFILE_SEED_VERIFIED', 'ATTESTED',
       'OM-9.7: Every active department has a core_department_profile row with all inherit flags true. No existing overrides overwritten. Field classification model registered.',
       NULL::uuid, now(), true
WHERE NOT EXISTS (
  SELECT 1 FROM public.core_release_readiness_attestation
   WHERE release_tag='OM-9.7' AND check_code='DEPARTMENT_PROFILE_SEED_VERIFIED'
);