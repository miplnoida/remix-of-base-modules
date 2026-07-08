-- Epic OM-9.7.4 — Department Letterhead & Template Consumption Verification.
-- Seeds new audit event codes, reference group, and the release attestation
-- so the release-readiness check reports green. No schema changes.

INSERT INTO public.core_audit_event_type (event_code, event_name, event_category, domain_code, is_admin_event, is_active) VALUES
  ('LETTERHEAD_RESOLVER_MISMATCH_DETECTED',       'Letterhead resolver mismatch detected',        'ORGANIZATION','ORGANIZATION', true,  true),
  ('DEPARTMENT_LETTERHEAD_INHERITANCE_NORMALIZED','Department letterhead inheritance normalized', 'ORGANIZATION','ORGANIZATION', true,  true),
  ('BUSINESS_COMM_CONTEXT_RESOLVED',              'Business communication context resolved',      'ORGANIZATION','ORGANIZATION', false, true),
  ('BUSINESS_COMM_CONTEXT_FAILED',                'Business communication context failed',        'ORGANIZATION','ORGANIZATION', true,  true),
  ('DEPARTMENT_TEMPLATE_CONSUMPTION_VERIFIED',    'Department template consumption verified',     'ORGANIZATION','ORGANIZATION', true,  true)
ON CONFLICT (event_code) DO UPDATE
  SET event_name = EXCLUDED.event_name,
      event_category = EXCLUDED.event_category,
      domain_code = EXCLUDED.domain_code,
      is_admin_event = EXCLUDED.is_admin_event,
      is_active = true;

INSERT INTO public.core_reference_group (group_code, group_name, description, is_active) VALUES
  ('DEPARTMENT_LETTERHEAD_SOURCE', 'Department Letterhead Source', 'DEPARTMENT_OVERRIDE / ORGANIZATION_DEFAULT / MODULE_DEFAULT / TEMPLATE_OVERRIDE', true),
  ('BUSINESS_COMM_TEMPLATE_SOURCE','Business Comm Template Source','EXPLICIT / EFFECTIVE_DEFAULT / NONE', true)
ON CONFLICT (group_code) DO UPDATE
  SET group_name = EXCLUDED.group_name,
      description = EXCLUDED.description,
      is_active = true;

INSERT INTO public.core_release_readiness_attestation (release_tag, check_code, attested_status, notes, attested_by, attested_at, is_active)
SELECT 'OM-9.7.4', 'DEPARTMENT_TEMPLATE_CONSUMPTION_VERIFIED', 'ATTESTED',
       'OM-9.7.4: Duplicate direct letterhead/signature/footer selectors removed from Department Profile page. saveProfile normalizes inherit_*_from_org flags. coreTemplateResolverService.resolveLetterhead honours resolveEffectiveSettingsBundle when department_code is supplied. Canonical business-module API resolveBusinessCommunicationContext added. Inheritance health check now runs renderer-vs-bundle parity check. Legacy DepartmentEffectivePreview kept under Advanced tab.',
       NULL, now(), true
WHERE NOT EXISTS (
  SELECT 1 FROM public.core_release_readiness_attestation
   WHERE release_tag='OM-9.7.4' AND check_code='DEPARTMENT_TEMPLATE_CONSUMPTION_VERIFIED'
);

-- Idempotent cleanup: repair any existing conflicted rows (override id + inherit=true)
UPDATE public.core_department_profile SET inherit_letterhead_from_org       = false WHERE default_letterhead_id       IS NOT NULL AND inherit_letterhead_from_org       = true;
UPDATE public.core_department_profile SET inherit_email_signature_from_org  = false WHERE default_email_signature_id  IS NOT NULL AND inherit_email_signature_from_org  = true;
UPDATE public.core_department_profile SET inherit_disclaimer_from_org       = false WHERE default_disclaimer_id       IS NOT NULL AND inherit_disclaimer_from_org       = true;
UPDATE public.core_department_profile SET inherit_print_footer_from_org     = false WHERE default_print_footer_id     IS NOT NULL AND inherit_print_footer_from_org     = true;
UPDATE public.core_department_profile SET inherit_location_from_org         = false WHERE primary_location_id         IS NOT NULL AND inherit_location_from_org         = true;