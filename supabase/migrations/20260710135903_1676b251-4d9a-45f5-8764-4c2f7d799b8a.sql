UPDATE public.communication_hub_module_event_registry
SET notes = COALESCE(notes || E'\n','') || 'Adapter dry-run validated via Module Adapter Tests on 2026-07-10.',
    updated_at = now()
WHERE (module_code, event_code) IN (
  ('LEGAL','INTERNAL_CASE_ASSIGNMENT_NOTICE'),
  ('INSURED_PERSON','INTERNAL_PROFILE_REVIEW_NOTICE'),
  ('BENEFITS','INTERNAL_CLAIM_REVIEW_NOTICE'),
  ('EMPLOYER_REGISTRATION','INTERNAL_ACKNOWLEDGEMENT_NOTICE'),
  ('EMPLOYER_REGISTRATION','INTERNAL_APPROVAL_REVIEW_NOTICE'),
  ('COMPLIANCE','INTERNAL_CASE_STATUS_NOTICE')
);