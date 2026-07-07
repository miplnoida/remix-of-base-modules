
-- ============ 1) core_audit_event_type ============
CREATE TABLE IF NOT EXISTS public.core_audit_event_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_code text NOT NULL UNIQUE,
  event_name text NOT NULL,
  description text,
  module_code text NOT NULL DEFAULT 'CORE',
  domain_code text,
  event_category text NOT NULL DEFAULT 'DATA_CHANGE',
  default_severity text NOT NULL DEFAULT 'INFO',
  default_risk_level text NOT NULL DEFAULT 'LOW',
  is_security_event boolean NOT NULL DEFAULT false,
  is_pii_event boolean NOT NULL DEFAULT false,
  is_financial_event boolean NOT NULL DEFAULT false,
  is_health_event boolean NOT NULL DEFAULT false,
  is_admin_event boolean NOT NULL DEFAULT false,
  is_migration_event boolean NOT NULL DEFAULT false,
  requires_reason boolean NOT NULL DEFAULT false,
  requires_before_after boolean NOT NULL DEFAULT false,
  retention_days integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_audit_event_type TO authenticated;
GRANT ALL ON public.core_audit_event_type TO service_role;

-- ============ 2) core_audit_log ============
CREATE TABLE IF NOT EXISTS public.core_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_time timestamptz NOT NULL DEFAULT now(),
  event_code text NOT NULL,
  event_name text,
  event_category text,
  severity text NOT NULL DEFAULT 'INFO',
  risk_level text NOT NULL DEFAULT 'LOW',
  actor_user_id uuid,
  actor_name text,
  actor_email text,
  actor_role_summary text,
  module_code text NOT NULL DEFAULT 'CORE',
  domain_code text,
  entity_type text,
  entity_id text,
  entity_display_name text,
  action text NOT NULL,
  outcome text NOT NULL DEFAULT 'SUCCESS',
  before_value jsonb,
  after_value jsonb,
  changed_fields text[],
  reason text,
  notes text,
  ip_address text,
  user_agent text,
  session_id text,
  correlation_id text,
  request_id text,
  source text NOT NULL DEFAULT 'APPLICATION',
  source_route text,
  source_component text,
  source_service text,
  contains_pii boolean NOT NULL DEFAULT false,
  contains_financial_data boolean NOT NULL DEFAULT false,
  contains_health_data boolean NOT NULL DEFAULT false,
  metadata jsonb,
  is_system_generated boolean NOT NULL DEFAULT false,
  is_sensitive boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_audit_log TO authenticated;
GRANT ALL ON public.core_audit_log TO service_role;

CREATE INDEX IF NOT EXISTS idx_core_audit_log_event_time ON public.core_audit_log(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_core_audit_log_event_code ON public.core_audit_log(event_code);
CREATE INDEX IF NOT EXISTS idx_core_audit_log_actor ON public.core_audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_core_audit_log_module ON public.core_audit_log(module_code);
CREATE INDEX IF NOT EXISTS idx_core_audit_log_entity ON public.core_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_core_audit_log_severity ON public.core_audit_log(severity);
CREATE INDEX IF NOT EXISTS idx_core_audit_log_risk ON public.core_audit_log(risk_level);
CREATE INDEX IF NOT EXISTS idx_core_audit_log_outcome ON public.core_audit_log(outcome);
CREATE INDEX IF NOT EXISTS idx_core_audit_log_correlation ON public.core_audit_log(correlation_id);

-- ============ 3) core_audit_policy ============
CREATE TABLE IF NOT EXISTS public.core_audit_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_code text NOT NULL UNIQUE,
  policy_name text NOT NULL,
  description text,
  module_code text NOT NULL DEFAULT 'CORE',
  domain_code text,
  entity_type text,
  event_code text,
  audit_create boolean NOT NULL DEFAULT true,
  audit_update boolean NOT NULL DEFAULT true,
  audit_delete boolean NOT NULL DEFAULT true,
  audit_view_sensitive boolean NOT NULL DEFAULT false,
  audit_export boolean NOT NULL DEFAULT true,
  audit_security_actions boolean NOT NULL DEFAULT true,
  capture_before_after boolean NOT NULL DEFAULT true,
  capture_changed_fields boolean NOT NULL DEFAULT true,
  capture_actor_context boolean NOT NULL DEFAULT true,
  capture_request_context boolean NOT NULL DEFAULT true,
  mask_pii_in_audit boolean NOT NULL DEFAULT true,
  allow_sensitive_payload boolean NOT NULL DEFAULT false,
  retention_days integer NOT NULL DEFAULT 2555,
  is_required boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_audit_policy TO authenticated;
GRANT ALL ON public.core_audit_policy TO service_role;

-- ============ updated_at triggers (reuse existing helper if present) ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE FUNCTION public.update_updated_at_column() RETURNS trigger AS $f$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $f$ LANGUAGE plpgsql SET search_path = public;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_core_audit_event_type_updated ON public.core_audit_event_type;
CREATE TRIGGER trg_core_audit_event_type_updated BEFORE UPDATE ON public.core_audit_event_type FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_core_audit_policy_updated ON public.core_audit_policy;
CREATE TRIGGER trg_core_audit_policy_updated BEFORE UPDATE ON public.core_audit_policy FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Register tables in core_table_registry ============
INSERT INTO public.core_table_registry (table_name, table_prefix, ownership_type, module_code, domain_code, table_category, is_legacy_table, data_classification, lifecycle_status, canonical_admin_route, contains_pii, is_active)
VALUES
  ('core_audit_log',        'core_', 'PLATFORM', 'CORE', 'GOVERNANCE', 'AUDIT', false, 'RESTRICTED', 'ACTIVE', '/admin/audit-log', true,  true),
  ('core_audit_event_type', 'core_', 'PLATFORM', 'CORE', 'GOVERNANCE', 'AUDIT', false, 'INTERNAL',   'ACTIVE', '/admin/audit-log', false, true),
  ('core_audit_policy',     'core_', 'PLATFORM', 'CORE', 'GOVERNANCE', 'AUDIT', false, 'INTERNAL',   'ACTIVE', '/admin/audit-log', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_category=EXCLUDED.table_category,
  domain_code=EXCLUDED.domain_code,
  canonical_admin_route=EXCLUDED.canonical_admin_route,
  lifecycle_status=EXCLUDED.lifecycle_status,
  is_active=EXCLUDED.is_active;

-- ============ Register /admin/audit-log route ============
INSERT INTO public.core_admin_route_registry (route_path, page_name, admin_domain, canonical_status, owner_module_code, requires_permission, show_in_platform_admin, is_active)
VALUES ('/admin/audit-log', 'Audit Log', 'GOVERNANCE', 'CANONICAL', 'CORE', 'core.admin.audit.view', true, true)
ON CONFLICT (route_path) DO UPDATE SET
  page_name=EXCLUDED.page_name,
  admin_domain=EXCLUDED.admin_domain,
  canonical_status=EXCLUDED.canonical_status,
  owner_module_code=EXCLUDED.owner_module_code,
  requires_permission=EXCLUDED.requires_permission,
  show_in_platform_admin=EXCLUDED.show_in_platform_admin,
  is_active=EXCLUDED.is_active;

-- ============ Seed audit event types ============
INSERT INTO public.core_audit_event_type (event_code, event_name, module_code, domain_code, event_category, default_severity, default_risk_level, is_admin_event, is_security_event, is_migration_event, is_pii_event, is_financial_event, requires_before_after)
VALUES
  ('ADMIN_ROUTE_CREATED',              'Admin Route Created',            'CORE', 'GOVERNANCE',  'CONFIGURATION', 'INFO', 'MEDIUM', true, false, false, false, false, true),
  ('ADMIN_ROUTE_UPDATED',              'Admin Route Updated',            'CORE', 'GOVERNANCE',  'CONFIGURATION', 'INFO', 'MEDIUM', true, false, false, false, false, true),
  ('ADMIN_ROUTE_DEACTIVATED',          'Admin Route Deactivated',        'CORE', 'GOVERNANCE',  'CONFIGURATION', 'WARNING','HIGH', true, false, false, false, false, false),
  ('ADMIN_ROUTE_REACTIVATED',          'Admin Route Reactivated',        'CORE', 'GOVERNANCE',  'CONFIGURATION', 'INFO', 'MEDIUM', true, false, false, false, false, false),
  ('TABLE_REGISTRY_CREATED',           'Table Registered',               'CORE', 'GOVERNANCE',  'CONFIGURATION', 'INFO', 'MEDIUM', true, false, false, false, false, true),
  ('TABLE_REGISTRY_UPDATED',           'Table Registry Updated',         'CORE', 'GOVERNANCE',  'CONFIGURATION', 'INFO', 'MEDIUM', true, false, false, false, false, true),
  ('TABLE_REGISTRY_DEACTIVATED',       'Table Deactivated',              'CORE', 'GOVERNANCE',  'CONFIGURATION', 'WARNING','HIGH', true, false, false, false, false, false),
  ('TABLE_REGISTRY_REACTIVATED',       'Table Reactivated',              'CORE', 'GOVERNANCE',  'CONFIGURATION', 'INFO', 'MEDIUM', true, false, false, false, false, false),
  ('LEGACY_TABLE_MAP_CREATED',         'Legacy Table Mapped',            'CORE', 'MIGRATION',   'LEGACY_MAPPING','INFO', 'MEDIUM', true, false, true,  false, false, true),
  ('LEGACY_TABLE_MAP_UPDATED',         'Legacy Table Map Updated',       'CORE', 'MIGRATION',   'LEGACY_MAPPING','INFO', 'MEDIUM', true, false, true,  false, false, true),
  ('LEGACY_TABLE_MAP_DEACTIVATED',     'Legacy Table Map Deactivated',   'CORE', 'MIGRATION',   'LEGACY_MAPPING','WARNING','HIGH', true, false, true,  false, false, false),
  ('LEGACY_TABLE_MAP_REACTIVATED',     'Legacy Table Map Reactivated',   'CORE', 'MIGRATION',   'LEGACY_MAPPING','INFO', 'MEDIUM', true, false, true,  false, false, false),
  ('LEGACY_TABLE_MAP_APPROVED',        'Legacy Table Map Approved',      'CORE', 'MIGRATION',   'APPROVAL',      'INFO', 'HIGH',   true, false, true,  false, false, false),
  ('LEGACY_COLUMN_MAP_CREATED',        'Legacy Column Mapped',           'CORE', 'MIGRATION',   'LEGACY_MAPPING','INFO', 'LOW',    true, false, true,  false, false, false),
  ('LEGACY_COLUMN_MAP_UPDATED',        'Legacy Column Map Updated',      'CORE', 'MIGRATION',   'LEGACY_MAPPING','INFO', 'LOW',    true, false, true,  false, false, true),
  ('LEGACY_COLUMN_MAP_DEACTIVATED',    'Legacy Column Map Deactivated',  'CORE', 'MIGRATION',   'LEGACY_MAPPING','WARNING','MEDIUM',true,false, true, false, false, false),
  ('LEGACY_VALUE_MAP_CREATED',         'Legacy Value Mapped',            'CORE', 'MIGRATION',   'LEGACY_MAPPING','INFO', 'LOW',    true, false, true,  false, false, false),
  ('LEGACY_VALUE_MAP_UPDATED',         'Legacy Value Map Updated',       'CORE', 'MIGRATION',   'LEGACY_MAPPING','INFO', 'LOW',    true, false, true,  false, false, true),
  ('LEGACY_VALUE_MAP_DEACTIVATED',     'Legacy Value Map Deactivated',   'CORE', 'MIGRATION',   'LEGACY_MAPPING','WARNING','MEDIUM',true,false, true, false, false, false),
  ('REFERENCE_SOURCE_CREATED',         'Reference Source Created',       'CORE', 'GOVERNANCE',  'REFERENCE_DATA','INFO', 'MEDIUM', true, false, false, false, false, false),
  ('REFERENCE_SOURCE_UPDATED',         'Reference Source Updated',       'CORE', 'GOVERNANCE',  'REFERENCE_DATA','INFO', 'MEDIUM', true, false, false, false, false, true),
  ('REFERENCE_SOURCE_DEACTIVATED',     'Reference Source Deactivated',   'CORE', 'GOVERNANCE',  'REFERENCE_DATA','WARNING','HIGH', true, false, false, false, false, false),
  ('REFERENCE_SOURCE_REACTIVATED',     'Reference Source Reactivated',   'CORE', 'GOVERNANCE',  'REFERENCE_DATA','INFO', 'MEDIUM', true, false, false, false, false, false),
  ('REFERENCE_CONSUMER_CREATED',       'Reference Consumer Created',     'CORE', 'GOVERNANCE',  'REFERENCE_DATA','INFO', 'LOW',    true, false, false, false, false, false),
  ('REFERENCE_CONSUMER_UPDATED',       'Reference Consumer Updated',     'CORE', 'GOVERNANCE',  'REFERENCE_DATA','INFO', 'LOW',    true, false, false, false, false, true),
  ('REFERENCE_CONSUMER_DEACTIVATED',   'Reference Consumer Deactivated', 'CORE', 'GOVERNANCE',  'REFERENCE_DATA','WARNING','MEDIUM',true,false, false, false, false, false),
  ('REFERENCE_CONSUMER_REACTIVATED',   'Reference Consumer Reactivated', 'CORE', 'GOVERNANCE',  'REFERENCE_DATA','INFO', 'LOW',    true, false, false, false, false, false),
  ('REFERENCE_DEPENDENCY_CREATED',     'Reference Dependency Created',   'CORE', 'GOVERNANCE',  'REFERENCE_DATA','INFO', 'LOW',    true, false, false, false, false, false),
  ('REFERENCE_DEPENDENCY_UPDATED',     'Reference Dependency Updated',   'CORE', 'GOVERNANCE',  'REFERENCE_DATA','INFO', 'LOW',    true, false, false, false, false, true),
  ('REFERENCE_DEPENDENCY_DEACTIVATED', 'Reference Dependency Deactivated','CORE','GOVERNANCE',  'REFERENCE_DATA','WARNING','MEDIUM',true,false, false, false, false, false),
  ('REFERENCE_DEPENDENCY_REACTIVATED', 'Reference Dependency Reactivated','CORE','GOVERNANCE',  'REFERENCE_DATA','INFO', 'LOW',    true, false, false, false, false, false),
  ('REFERENCE_POLICY_CREATED',         'Reference Policy Created',       'CORE', 'GOVERNANCE',  'REFERENCE_DATA','INFO', 'MEDIUM', true, false, false, false, false, false),
  ('REFERENCE_POLICY_UPDATED',         'Reference Policy Updated',       'CORE', 'GOVERNANCE',  'REFERENCE_DATA','INFO', 'MEDIUM', true, false, false, false, false, true),
  ('REFERENCE_POLICY_DEACTIVATED',     'Reference Policy Deactivated',   'CORE', 'GOVERNANCE',  'REFERENCE_DATA','WARNING','HIGH', true, false, false, false, false, false),
  ('REFERENCE_POLICY_REACTIVATED',     'Reference Policy Reactivated',   'CORE', 'GOVERNANCE',  'REFERENCE_DATA','INFO', 'MEDIUM', true, false, false, false, false, false),
  ('PERMISSION_REGISTRY_CREATED',      'Permission Created',             'CORE', 'SECURITY',    'CONFIGURATION', 'INFO', 'HIGH',   true, true,  false, false, false, false),
  ('PERMISSION_REGISTRY_UPDATED',      'Permission Updated',             'CORE', 'SECURITY',    'CONFIGURATION', 'INFO', 'HIGH',   true, true,  false, false, false, true),
  ('PERMISSION_REGISTRY_DEACTIVATED',  'Permission Deactivated',         'CORE', 'SECURITY',    'CONFIGURATION', 'WARNING','HIGH', true, true,  false, false, false, false),
  ('PERMISSION_REGISTRY_REACTIVATED',  'Permission Reactivated',         'CORE', 'SECURITY',    'CONFIGURATION', 'INFO', 'MEDIUM', true, true,  false, false, false, false),
  ('PERMISSION_REGISTRY_SYNC_STARTED', 'Permission Sync Started',        'CORE', 'SECURITY',    'CONFIGURATION', 'INFO', 'MEDIUM', true, true,  false, false, false, false),
  ('PERMISSION_REGISTRY_SYNC_COMPLETED','Permission Sync Completed',     'CORE', 'SECURITY',    'CONFIGURATION', 'INFO', 'MEDIUM', true, true,  false, false, false, false),
  ('PERMISSION_REGISTRY_SYNC_FAILED',  'Permission Sync Failed',         'CORE', 'SECURITY',    'ERROR',         'ERROR','HIGH',  true, true,  false, false, false, false),
  ('USER_PROFILE_UPDATED',             'User Profile Updated',           'CORE', 'SECURITY',    'DATA_CHANGE',   'INFO', 'LOW',    true, false, false, true,  false, true),
  ('STAFF_PROFILE_CREATED',            'Staff Profile Created',          'CORE', 'SECURITY',    'DATA_CHANGE',   'INFO', 'LOW',    true, false, false, true,  false, false),
  ('STAFF_PROFILE_UPDATED',            'Staff Profile Updated',          'CORE', 'SECURITY',    'DATA_CHANGE',   'INFO', 'LOW',    true, false, false, true,  false, true),
  ('STAFF_ASSIGNMENT_CREATED',         'Staff Assignment Created',       'CORE', 'SECURITY',    'DATA_CHANGE',   'INFO', 'MEDIUM', true, false, false, false, false, false),
  ('STAFF_ASSIGNMENT_UPDATED',         'Staff Assignment Updated',       'CORE', 'SECURITY',    'DATA_CHANGE',   'INFO', 'MEDIUM', true, false, false, false, false, true),
  ('STAFF_ASSIGNMENT_DEACTIVATED',     'Staff Assignment Deactivated',   'CORE', 'SECURITY',    'DATA_CHANGE',   'WARNING','MEDIUM',true,false, false, false, false, false),
  ('STAFF_ASSIGNMENT_REACTIVATED',     'Staff Assignment Reactivated',   'CORE', 'SECURITY',    'DATA_CHANGE',   'INFO', 'LOW',    true, false, false, false, false, false),
  ('STAFF_ASSIGNMENT_SET_PRIMARY',     'Primary Assignment Set',         'CORE', 'SECURITY',    'DATA_CHANGE',   'INFO', 'LOW',    true, false, false, false, false, false),
  ('USER_SECURITY_STATE_UPDATED',      'User Security State Updated',    'CORE', 'SECURITY',    'SECURITY',      'WARNING','HIGH', true, true,  false, true,  false, true),
  ('USER_LOCKED',                      'User Locked',                    'CORE', 'SECURITY',    'SECURITY',      'WARNING','HIGH', true, true,  false, true,  false, false),
  ('USER_UNLOCKED',                    'User Unlocked',                  'CORE', 'SECURITY',    'SECURITY',      'INFO', 'MEDIUM', true, true,  false, true,  false, false),
  ('USER_SUSPENDED',                   'User Suspended',                 'CORE', 'SECURITY',    'SECURITY',      'WARNING','HIGH', true, true,  false, true,  false, false),
  ('USER_DISABLED',                    'User Disabled',                  'CORE', 'SECURITY',    'SECURITY',      'WARNING','HIGH', true, true,  false, true,  false, false),
  ('USER_ENABLED',                     'User Enabled',                   'CORE', 'SECURITY',    'SECURITY',      'INFO', 'MEDIUM', true, true,  false, true,  false, false),
  ('USER_PASSWORD_RESET_REQUIRED',     'Password Reset Required',        'CORE', 'SECURITY',    'SECURITY',      'INFO', 'MEDIUM', true, true,  false, true,  false, false),
  ('USER_DELEGATION_CREATED',          'User Delegation Created',        'CORE', 'SECURITY',    'DATA_CHANGE',   'INFO', 'HIGH',   true, true,  false, true,  false, false),
  ('USER_DELEGATION_UPDATED',          'User Delegation Updated',        'CORE', 'SECURITY',    'DATA_CHANGE',   'INFO', 'HIGH',   true, true,  false, true,  false, true),
  ('USER_DELEGATION_REVOKED',          'User Delegation Revoked',        'CORE', 'SECURITY',    'DATA_CHANGE',   'WARNING','HIGH', true, true,  false, true,  false, false),
  ('USER_ROLE_ASSIGNED',               'Role Assigned',                  'CORE', 'SECURITY',    'SECURITY',      'INFO', 'HIGH',   true, true,  false, true,  false, false),
  ('USER_ROLE_REMOVED',                'Role Removed',                   'CORE', 'SECURITY',    'SECURITY',      'WARNING','HIGH', true, true,  false, true,  false, false),
  ('OFFICE_CREATED',                   'Office Created',                 'CORE', 'ORGANISATION','DATA_CHANGE',   'INFO', 'LOW',    true, false, false, false, false, false),
  ('OFFICE_UPDATED',                   'Office Updated',                 'CORE', 'ORGANISATION','DATA_CHANGE',   'INFO', 'LOW',    true, false, false, false, false, true),
  ('OFFICE_DEACTIVATED',               'Office Deactivated',             'CORE', 'ORGANISATION','DATA_CHANGE',   'WARNING','MEDIUM',true,false, false, false, false, false),
  ('OFFICE_REACTIVATED',               'Office Reactivated',             'CORE', 'ORGANISATION','DATA_CHANGE',   'INFO', 'LOW',    true, false, false, false, false, false),
  ('DEPARTMENT_CREATED',               'Department Created',             'CORE', 'ORGANISATION','DATA_CHANGE',   'INFO', 'LOW',    true, false, false, false, false, false),
  ('DEPARTMENT_UPDATED',               'Department Updated',             'CORE', 'ORGANISATION','DATA_CHANGE',   'INFO', 'LOW',    true, false, false, false, false, true),
  ('DEPARTMENT_DEACTIVATED',           'Department Deactivated',         'CORE', 'ORGANISATION','DATA_CHANGE',   'WARNING','MEDIUM',true,false, false, false, false, false),
  ('DEPARTMENT_REACTIVATED',           'Department Reactivated',         'CORE', 'ORGANISATION','DATA_CHANGE',   'INFO', 'LOW',    true, false, false, false, false, false),
  ('DESIGNATION_CREATED',              'Designation Created',            'CORE', 'ORGANISATION','DATA_CHANGE',   'INFO', 'LOW',    true, false, false, false, false, false),
  ('DESIGNATION_UPDATED',              'Designation Updated',            'CORE', 'ORGANISATION','DATA_CHANGE',   'INFO', 'LOW',    true, false, false, false, false, true),
  ('DESIGNATION_DEACTIVATED',          'Designation Deactivated',        'CORE', 'ORGANISATION','DATA_CHANGE',   'WARNING','MEDIUM',true,false, false, false, false, false),
  ('DESIGNATION_REACTIVATED',          'Designation Reactivated',        'CORE', 'ORGANISATION','DATA_CHANGE',   'INFO', 'LOW',    true, false, false, false, false, false),
  ('ORGANIZATION_PROFILE_UPDATED',     'Organization Profile Updated',   'CORE', 'ORGANISATION','CONFIGURATION', 'INFO', 'HIGH',   true, false, false, false, false, true),
  ('OFFICE_LOCATION_CREATED',          'Office Location Created',        'CORE', 'ORGANISATION','DATA_CHANGE',   'INFO', 'LOW',    true, false, false, false, false, false),
  ('OFFICE_LOCATION_UPDATED',          'Office Location Updated',        'CORE', 'ORGANISATION','DATA_CHANGE',   'INFO', 'LOW',    true, false, false, false, false, true),
  ('OFFICE_LOCATION_DEACTIVATED',      'Office Location Deactivated',    'CORE', 'ORGANISATION','DATA_CHANGE',   'WARNING','MEDIUM',true,false, false, false, false, false),
  ('OFFICE_LOCATION_REACTIVATED',      'Office Location Reactivated',    'CORE', 'ORGANISATION','DATA_CHANGE',   'INFO', 'LOW',    true, false, false, false, false, false),
  ('CALENDAR_HOLIDAY_CREATED',         'Holiday Created',                'CORE', 'ORGANISATION','DATA_CHANGE',   'INFO', 'LOW',    true, false, false, false, false, false),
  ('CALENDAR_HOLIDAY_UPDATED',         'Holiday Updated',                'CORE', 'ORGANISATION','DATA_CHANGE',   'INFO', 'LOW',    true, false, false, false, false, true),
  ('CALENDAR_HOLIDAY_DEACTIVATED',     'Holiday Deactivated',            'CORE', 'ORGANISATION','DATA_CHANGE',   'WARNING','MEDIUM',true,false, false, false, false, false),
  ('CALENDAR_HOLIDAY_REACTIVATED',     'Holiday Reactivated',            'CORE', 'ORGANISATION','DATA_CHANGE',   'INFO', 'LOW',    true, false, false, false, false, false),
  ('LOGIN_SUCCESS',                    'Login Successful',               'CORE', 'SECURITY',    'AUTH',          'INFO', 'LOW',    false,true,  false, true,  false, false),
  ('LOGIN_FAILURE',                    'Login Failed',                   'CORE', 'SECURITY',    'AUTH',          'WARNING','MEDIUM',false,true, false, true,  false, false),
  ('ACCESS_DENIED',                    'Access Denied',                  'CORE', 'SECURITY',    'SECURITY',      'WARNING','HIGH', false,true,  false, false, false, false),
  ('EXPORT_CREATED',                   'Export Created',                 'CORE', 'GOVERNANCE',  'EXPORT',        'INFO', 'HIGH',   true, false, false, true,  true,  false),
  ('REPORT_VIEWED',                    'Report Viewed',                  'CORE', 'GOVERNANCE',  'REPORT',        'INFO', 'LOW',    false,false, false, false, false, false),
  ('SENSITIVE_DATA_VIEWED',            'Sensitive Data Viewed',          'CORE', 'SECURITY',    'SECURITY',      'INFO', 'HIGH',   false,true,  false, true,  false, false)
ON CONFLICT (event_code) DO UPDATE SET
  event_name = EXCLUDED.event_name,
  event_category = EXCLUDED.event_category,
  default_severity = EXCLUDED.default_severity,
  default_risk_level = EXCLUDED.default_risk_level,
  is_admin_event = EXCLUDED.is_admin_event,
  is_security_event = EXCLUDED.is_security_event,
  is_migration_event = EXCLUDED.is_migration_event,
  is_pii_event = EXCLUDED.is_pii_event,
  is_financial_event = EXCLUDED.is_financial_event,
  requires_before_after = EXCLUDED.requires_before_after;

-- ============ Seed default audit policies ============
INSERT INTO public.core_audit_policy (policy_code, policy_name, description, module_code, domain_code, audit_view_sensitive, capture_before_after, capture_changed_fields, capture_actor_context, capture_request_context, mask_pii_in_audit, allow_sensitive_payload, retention_days, is_required)
VALUES
  ('CORE_ADMIN_DEFAULT',      'Core Admin Default',       'Default audit policy for admin actions',              'CORE', 'ADMINISTRATION', false, true, true, true, true, true, false, 2555, true),
  ('CORE_SECURITY_ACTIONS',   'Core Security Actions',    'Audit policy for security actions',                   'CORE', 'SECURITY',       true,  true, true, true, true, true, false, 2555, true),
  ('CORE_REFERENCE_DATA',     'Core Reference Data',      'Audit policy for reference/master data changes',      'CORE', 'GOVERNANCE',     false, true, true, true, true, true, false, 2555, true),
  ('CORE_LEGACY_MAPPING',     'Core Legacy Mapping',      'Audit policy for legacy mapping changes',             'CORE', 'MIGRATION',      false, true, true, true, true, true, false, 2555, true),
  ('CORE_PERMISSION_REGISTRY','Core Permission Registry', 'Audit policy for permission registry changes',        'CORE', 'SECURITY',       true,  true, true, true, true, true, false, 2555, true),
  ('CORE_IDENTITY',           'Core Identity',            'Audit policy for identity/staff/delegation changes',  'CORE', 'SECURITY',       true,  true, true, true, true, true, false, 2555, true),
  ('CORE_ORGANIZATION',       'Core Organization',        'Audit policy for organization/office/dept/location',  'CORE', 'ORGANISATION',   false, true, true, true, true, true, false, 2555, true),
  ('CORE_EXPORTS',            'Core Exports',             'Audit policy for exports and large data downloads',   'CORE', 'GOVERNANCE',     true,  false,false,true, true, true, false, 2555, true),
  ('CORE_SENSITIVE_DATA',     'Core Sensitive Data',      'Audit policy for sensitive/PII/health/financial data','CORE', 'SECURITY',       true,  true, true, true, true, true, false, 2555, true)
ON CONFLICT (policy_code) DO UPDATE SET
  policy_name = EXCLUDED.policy_name,
  description = EXCLUDED.description,
  audit_view_sensitive = EXCLUDED.audit_view_sensitive,
  capture_before_after = EXCLUDED.capture_before_after,
  capture_changed_fields = EXCLUDED.capture_changed_fields,
  capture_actor_context = EXCLUDED.capture_actor_context,
  capture_request_context = EXCLUDED.capture_request_context,
  mask_pii_in_audit = EXCLUDED.mask_pii_in_audit,
  allow_sensitive_payload = EXCLUDED.allow_sensitive_payload,
  retention_days = EXCLUDED.retention_days,
  is_required = EXCLUDED.is_required;

-- ============ Seed permissions ============
INSERT INTO public.core_permission_registry (permission_key, permission_name, module_code, domain_code, permission_scope, action_code, is_platform_permission, is_admin_permission, is_sensitive_permission, risk_level, source_file, is_active)
VALUES
  ('core.admin.audit.view',                'View Audit Log',              'CORE', 'GOVERNANCE', 'PAGE',  'view',  true, true, true,  'MEDIUM',   'src/platform/audit/auditPermissions.ts', true),
  ('core.admin.audit.manage_event_types',  'Manage Audit Event Types',    'CORE', 'GOVERNANCE', 'ADMIN', 'manage','true'::boolean, true, false, 'HIGH',     'src/platform/audit/auditPermissions.ts', true),
  ('core.admin.audit.manage_policies',     'Manage Audit Policies',       'CORE', 'GOVERNANCE', 'ADMIN', 'manage', true, true, false, 'CRITICAL', 'src/platform/audit/auditPermissions.ts', true),
  ('core.admin.audit.export',              'Export Audit Log',            'CORE', 'GOVERNANCE', 'ACTION','export', true, true, true,  'HIGH',     'src/platform/audit/auditPermissions.ts', true),
  ('core.admin.audit.view_sensitive',      'View Sensitive Audit Details','CORE', 'GOVERNANCE', 'ACTION','view',   true, true, true,  'CRITICAL', 'src/platform/audit/auditPermissions.ts', true)
ON CONFLICT (permission_key) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  domain_code = EXCLUDED.domain_code,
  permission_scope = EXCLUDED.permission_scope,
  is_platform_permission = EXCLUDED.is_platform_permission,
  is_admin_permission = EXCLUDED.is_admin_permission,
  is_sensitive_permission = EXCLUDED.is_sensitive_permission,
  risk_level = EXCLUDED.risk_level,
  source_file = EXCLUDED.source_file,
  is_active = EXCLUDED.is_active;
