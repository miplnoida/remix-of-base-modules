-- Epic OM-3.1: seed the attestation audit event type used by the release-
-- readiness check. Uses the same column shape as the OM-3 seed migration.
INSERT INTO public.core_audit_event_type
  (event_code, event_name, module_code, domain_code, event_category,
   default_severity, default_risk_level,
   is_admin_event, is_security_event, is_migration_event,
   is_pii_event, is_financial_event, requires_before_after)
VALUES
  ('ORG_ACTION_PERMISSIONS_ENFORCED', 'OM-3.1 Action Permissions Enforced', 'CORE','ORGANIZATION','CONFIGURATION','INFO','MEDIUM', true,false,false,false,false,false)
ON CONFLICT (event_code) DO UPDATE
SET event_name = EXCLUDED.event_name;
