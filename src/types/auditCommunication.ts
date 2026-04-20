/**
 * Audit Communication System types — Compliance module only.
 * All entities prefixed `ce_audit_communication_*` in DB.
 */

export type CeCommType =
  | 'audit_intimation' | 'books_required' | 'visit_reminder'
  | 'additional_info_request' | 'clarification_request' | 'interim_findings'
  | 'evidence_summary' | 'draft_findings'
  | 'final_report' | 'violation_notice' | 'corrective_action'
  | 'acknowledgment_request' | 'dispute_instructions' | 'due_date_reminder'
  | 'escalation_notice';

export type CeCommChannel = 'email' | 'sms' | 'both';

export type CeCommStatus =
  | 'draft' | 'pending_approval' | 'approved' | 'rejected'
  | 'sending' | 'sent' | 'partial' | 'failed' | 'cancelled';

export type CeCommApprovalRole = 'inspector' | 'lead_inspector' | 'supervisor' | 'legal';

export type CeCommDeliveryStatus =
  | 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked'
  | 'bounced' | 'failed' | 'suppressed';

export type CeCommRecipientSource = 'visit_contact' | 'compliance_contact' | 'er_master' | 'manual';

export interface CommApprovalRule {
  roles: CeCommApprovalRole[];
}

export interface CommAttachmentRule {
  include_report_pdf?: boolean;
  include_evidence?: boolean;
  include_violations?: boolean;
  include_findings_memo?: boolean;
  include_books_annexure?: boolean;
  include_payment_summary?: boolean;
  use_secure_link?: boolean;
}

export interface CommRecipientRule {
  priority: CeCommRecipientSource[];
  allow_manual_add?: boolean;
}

export interface AuditCommunicationTemplate {
  id: string;
  template_code: string;
  template_name: string;
  comm_type: CeCommType;
  channel: CeCommChannel;
  email_subject: string | null;
  email_body: string | null;
  sms_body: string | null;
  approval_rule_json: CommApprovalRule;
  attachment_rule_json: CommAttachmentRule;
  recipient_rule_json: CommRecipientRule;
  branding_json: Record<string, unknown>;
  description: string | null;
  category: string;
  version_no: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface AuditCommunicationTemplateSection {
  id: string;
  template_id: string;
  section_key: string;
  section_label: string | null;
  body_html: string | null;
  sort_order: number;
  is_enabled: boolean;
}

export interface AuditCommunicationRecipient {
  id: string;
  communication_id: string;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_mobile: string | null;
  recipient_role: string | null;
  source: CeCommRecipientSource;
  is_primary: boolean;
  created_at: string;
}

export interface AuditCommunicationApproval {
  id: string;
  communication_id: string;
  step_no: number;
  required_role: CeCommApprovalRole;
  approver_user_id: string | null;
  approver_name: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  comments: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface AuditCommunicationDelivery {
  id: string;
  communication_id: string;
  recipient_id: string | null;
  channel: 'email' | 'sms';
  recipient_address: string;
  notification_log_id: string | null;
  status: CeCommDeliveryStatus;
  failure_reason: string | null;
  attempted_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  metadata: Record<string, unknown>;
}

export interface AuditCommunicationEvent {
  id: string;
  communication_id: string;
  event_type: string;
  actor_user_id: string | null;
  actor_name: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface AuditCommunicationAttachment {
  id: string;
  communication_id: string;
  attachment_kind: string;
  filename: string | null;
  file_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  source_ref_id: string | null;
  is_external: boolean;
  created_at: string;
  created_by: string | null;
}

export interface AuditCommunication {
  id: string;
  inspection_id: string | null;
  employer_id: string;
  template_id: string | null;
  comm_type: CeCommType;
  channel: CeCommChannel;
  status: CeCommStatus;
  subject_snapshot: string | null;
  email_body_snapshot: string | null;
  sms_body_snapshot: string | null;
  context_data_json: Record<string, unknown>;
  attachment_summary_json: unknown[];
  report_version_id: string | null;
  scheduled_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  sent_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // populated by service joins:
  template?: Pick<AuditCommunicationTemplate, 'template_code' | 'template_name' | 'category'>;
  recipients?: AuditCommunicationRecipient[];
  approvals?: AuditCommunicationApproval[];
  deliveries?: AuditCommunicationDelivery[];
}

export interface CreateCommunicationDraftInput {
  inspectionId?: string | null;
  employerId: string;
  templateId: string;
  channel?: CeCommChannel;
  contextData?: Record<string, unknown>;
  manualRecipients?: Array<{ name?: string; email?: string; mobile?: string; role?: string }>;
  reportVersionId?: string | null;
  scheduledAt?: string | null;
  createdBy?: string;
}

export const COMM_TYPE_LABELS: Record<CeCommType, string> = {
  audit_intimation: 'Audit Intimation Notice',
  books_required: 'Books / Records Required',
  visit_reminder: 'Visit Reminder',
  additional_info_request: 'Additional Info Request',
  clarification_request: 'Clarification Request',
  interim_findings: 'Interim Findings',
  evidence_summary: 'Evidence Summary',
  draft_findings: 'Draft Findings / Report',
  final_report: 'Final Audit Report',
  violation_notice: 'Violation Notice',
  corrective_action: 'Corrective Action Request',
  acknowledgment_request: 'Acknowledgment Request',
  dispute_instructions: 'Dispute Instructions',
  due_date_reminder: 'Due Date Reminder',
  escalation_notice: 'Escalation Notice',
};

export const COMM_CATEGORY_LABELS: Record<string, string> = {
  pre_audit: 'Pre-Audit',
  during_audit: 'During Audit',
  post_approval: 'Post-Approval',
  general: 'General',
};
