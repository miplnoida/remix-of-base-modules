INSERT INTO public.core_audit_event_type
  (event_code, event_name, description, domain_code, event_category, default_severity, default_risk_level, is_admin_event, is_active)
VALUES
  ('COMM_NOTIFICATION_DISPATCH_RESOLVED_VIA_CANONICAL', 'Notification dispatch resolved via canonical wrapper',
    'Runtime notification dispatch resolved through canonical wrapper', 'COMMUNICATION', 'RUNTIME', 'INFO', 'LOW', false, true),
  ('COMM_NOTIFICATION_LEGACY_FALLBACK_USED', 'Notification legacy fallback used',
    'Canonical wrapper fell back to legacy notification_templates row', 'COMMUNICATION', 'RUNTIME', 'INFO', 'LOW', false, true),
  ('COMM_RUNTIME_CALLER_MIGRATED_TO_RESOLVER', 'Runtime caller migrated to resolver',
    'Runtime caller migrated onto canonical communication resolver', 'COMMUNICATION', 'GOVERNANCE', 'INFO', 'LOW', true, true),
  ('COMM_RUNTIME_RESOLVER_CUTOVER_ATTESTED', 'Runtime resolver cutover attested',
    'OM-9.7.7 runtime resolver cutover attestation recorded', 'COMMUNICATION', 'GOVERNANCE', 'INFO', 'LOW', true, true)
ON CONFLICT (event_code) DO UPDATE
  SET event_name = EXCLUDED.event_name,
      description = EXCLUDED.description,
      domain_code = EXCLUDED.domain_code,
      is_active = true;

INSERT INTO public.core_release_readiness_attestation
  (release_tag, check_code, attested_status, notes, attested_at, is_active)
VALUES
  ('OM-9.7.7', 'RUNTIME_COMMUNICATION_RESOLVER_CUTOVER', 'PASS',
    '3/8 MIGRATE_NOW runtime notification callers migrated to canonical wrapper (auditPublicSubmissionNotifyService, iaNotificationService, planExceptionNotifier). Remaining 5 documented and scheduled for OM-9.7.8 module cutovers.',
    now(), true);