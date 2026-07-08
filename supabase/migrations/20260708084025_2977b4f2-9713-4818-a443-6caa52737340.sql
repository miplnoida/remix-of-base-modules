INSERT INTO public.core_audit_event_type
  (event_code, event_name, module_code, domain_code, event_category, default_severity, default_risk_level, is_admin_event, is_active)
VALUES
  ('COMM_BUSINESS_MODULE_RESOLVER_BYPASS_DETECTED',
     'Business module direct-read of communication tables detected',
     'CORE','COMMUNICATION','SECURITY','WARN','HIGH', true, true),
  ('COMM_DIRECT_READ_GOVERNANCE_CHECK_RUN',
     'Communication direct-read governance CI gate executed',
     'CORE','COMMUNICATION','SYSTEM','INFO','LOW', true, true),
  ('COMM_DIRECT_READ_GOVERNANCE_VERIFIED',
     'Communication direct-read governance attestation recorded',
     'CORE','COMMUNICATION','SYSTEM','INFO','LOW', true, true)
ON CONFLICT (event_code) DO UPDATE
  SET event_name = EXCLUDED.event_name,
      module_code = EXCLUDED.module_code,
      domain_code = EXCLUDED.domain_code,
      event_category = EXCLUDED.event_category,
      default_severity = EXCLUDED.default_severity,
      default_risk_level = EXCLUDED.default_risk_level,
      is_admin_event = EXCLUDED.is_admin_event,
      is_active = true,
      updated_at = now();