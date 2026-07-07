export type AuditSeverity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
export type AuditRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AuditOutcome = 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'DENIED' | 'ERROR';
export type AuditSource =
  | 'APPLICATION'
  | 'DATABASE'
  | 'EDGE_FUNCTION'
  | 'MIGRATION'
  | 'SYSTEM'
  | 'IMPORT'
  | 'API'
  | 'SCHEDULER';
export type AuditEventCategory =
  | 'AUTH'
  | 'SECURITY'
  | 'DATA_CHANGE'
  | 'CONFIGURATION'
  | 'REFERENCE_DATA'
  | 'LEGACY_MAPPING'
  | 'MIGRATION'
  | 'WORKFLOW'
  | 'APPROVAL'
  | 'DOCUMENT'
  | 'NOTIFICATION'
  | 'REPORT'
  | 'EXPORT'
  | 'SYSTEM'
  | 'ERROR';

export interface AuditLogEntry {
  id: string;
  event_time: string;
  event_code: string;
  event_name?: string | null;
  event_category?: AuditEventCategory | null;
  severity: AuditSeverity;
  risk_level: AuditRiskLevel;
  actor_user_id?: string | null;
  actor_name?: string | null;
  actor_email?: string | null;
  actor_role_summary?: string | null;
  module_code: string;
  domain_code?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  entity_display_name?: string | null;
  action: string;
  outcome: AuditOutcome;
  before_value?: Record<string, unknown> | null;
  after_value?: Record<string, unknown> | null;
  changed_fields?: string[] | null;
  reason?: string | null;
  notes?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  session_id?: string | null;
  correlation_id?: string | null;
  request_id?: string | null;
  source: AuditSource;
  source_route?: string | null;
  source_component?: string | null;
  source_service?: string | null;
  contains_pii: boolean;
  contains_financial_data: boolean;
  contains_health_data: boolean;
  metadata?: Record<string, unknown> | null;
  is_system_generated: boolean;
  is_sensitive: boolean;
  created_at: string;
}

export interface AuditEventType {
  id: string;
  event_code: string;
  event_name: string;
  description?: string | null;
  module_code: string;
  domain_code?: string | null;
  event_category: AuditEventCategory;
  default_severity: AuditSeverity;
  default_risk_level: AuditRiskLevel;
  is_security_event: boolean;
  is_pii_event: boolean;
  is_financial_event: boolean;
  is_health_event: boolean;
  is_admin_event: boolean;
  is_migration_event: boolean;
  requires_reason: boolean;
  requires_before_after: boolean;
  retention_days?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditPolicy {
  id: string;
  policy_code: string;
  policy_name: string;
  description?: string | null;
  module_code: string;
  domain_code?: string | null;
  entity_type?: string | null;
  event_code?: string | null;
  audit_create: boolean;
  audit_update: boolean;
  audit_delete: boolean;
  audit_view_sensitive: boolean;
  audit_export: boolean;
  audit_security_actions: boolean;
  capture_before_after: boolean;
  capture_changed_fields: boolean;
  capture_actor_context: boolean;
  capture_request_context: boolean;
  mask_pii_in_audit: boolean;
  allow_sensitive_payload: boolean;
  retention_days: number;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLogFilters {
  search?: string;
  date_from?: string;
  date_to?: string;
  event_category?: AuditEventCategory;
  event_code?: string;
  module_code?: string;
  actor_user_id?: string;
  entity_type?: string;
  entity_id?: string;
  outcome?: AuditOutcome;
  severity?: AuditSeverity;
  risk_level?: AuditRiskLevel;
  contains_pii?: boolean;
  contains_financial_data?: boolean;
  contains_health_data?: boolean;
  source?: AuditSource;
  limit?: number;
}

export type AuditEventTypeFormValues = Omit<
  AuditEventType,
  'id' | 'created_at' | 'updated_at'
>;
export type AuditPolicyFormValues = Omit<AuditPolicy, 'id' | 'created_at' | 'updated_at'>;

export interface AuditSummaryMetrics {
  total: number;
  security: number;
  failedOrDenied: number;
  highRisk: number;
  configuration: number;
  userAdminChanges: number;
  sensitive: number;
  today: number;
}

export interface AuditLogPayload {
  event_code: string;
  event_name?: string;
  event_category?: AuditEventCategory;
  severity?: AuditSeverity;
  risk_level?: AuditRiskLevel;
  module_code?: string;
  domain_code?: string;
  entity_type?: string;
  entity_id?: string;
  entity_display_name?: string;
  action: string;
  outcome?: AuditOutcome;
  before_value?: Record<string, unknown> | null;
  after_value?: Record<string, unknown> | null;
  changed_fields?: string[];
  reason?: string;
  notes?: string;
  source?: AuditSource;
  source_route?: string;
  source_component?: string;
  source_service?: string;
  contains_pii?: boolean;
  contains_financial_data?: boolean;
  contains_health_data?: boolean;
  metadata?: Record<string, unknown>;
  is_sensitive?: boolean;
  correlation_id?: string;
}
