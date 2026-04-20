/**
 * Employer Online Response — admin configuration types.
 * Mirrors public.ce_online_response_settings and ce_online_response_policies.
 */

export type OnlineResponseMode =
  | 'NONE'
  | 'VIEW_ONLY'
  | 'ACKNOWLEDGMENT_ONLY'
  | 'LIMITED_RESPONSE'
  | 'FULL_RESPONSE';

export const ONLINE_RESPONSE_MODE_LABELS: Record<OnlineResponseMode, string> = {
  NONE: 'None (disabled)',
  VIEW_ONLY: 'View Only (read-only PDF)',
  ACKNOWLEDGMENT_ONLY: 'Acknowledgment Only',
  LIMITED_RESPONSE: 'Limited Response',
  FULL_RESPONSE: 'Full Response',
};

export const ONLINE_RESPONSE_MODE_DESCRIPTIONS: Record<OnlineResponseMode, string> = {
  NONE: 'Employer cannot view or interact with the document online.',
  VIEW_ONLY: 'Employer can view & download the full PDF but cannot respond.',
  ACKNOWLEDGMENT_ONLY: 'Employer can only acknowledge receipt of the document.',
  LIMITED_RESPONSE: 'Employer can acknowledge plus submit selected response types.',
  FULL_RESPONSE: 'Employer has full response capabilities (subject to per-flag controls).',
};

export interface OnlineResponseSettings {
  id: string;
  is_singleton: boolean;
  enabled: boolean;
  require_secure_token: boolean;
  default_link_ttl_hours: number;
  view_only_when_disabled: boolean;
  allowed_delivery_channels: string[];
  default_portal_branding: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface OnlineResponsePolicy {
  id: string;
  policy_name: string;
  description: string | null;
  priority: number;
  is_active: boolean;

  // Match keys (any can be NULL = wildcard)
  case_type: string | null;
  communication_type: string | null;
  report_type: string | null;
  enforcement_stage: string | null;

  // Resolved permissions
  response_mode: OnlineResponseMode;
  portal_enabled: boolean;
  allow_acknowledgment: boolean;
  allow_document_upload: boolean;
  allow_clarification: boolean;
  allow_narrative_response: boolean;
  allow_dispute: boolean;
  allow_corrective_action_response: boolean;
  allow_payment_response: boolean;

  // Lifecycle
  default_response_due_days: number | null;
  default_portal_ttl_hours: number | null;

  // Review workflow
  requires_inspector_review: boolean;
  requires_lead_review: boolean;
  requires_legal_review: boolean;
  workflow_id: string | null;
  reopens_case: boolean;
  triggers_notifications: boolean;

  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export const PERMISSION_FLAGS: Array<{ key: keyof OnlineResponsePolicy; label: string }> = [
  { key: 'portal_enabled', label: 'Portal Enabled' },
  { key: 'allow_acknowledgment', label: 'Acknowledgment' },
  { key: 'allow_document_upload', label: 'Document Upload' },
  { key: 'allow_clarification', label: 'Clarification' },
  { key: 'allow_narrative_response', label: 'Narrative Response' },
  { key: 'allow_dispute', label: 'Dispute' },
  { key: 'allow_corrective_action_response', label: 'Corrective Action' },
  { key: 'allow_payment_response', label: 'Payment Response' },
];

export const DELIVERY_CHANNEL_OPTIONS = ['email', 'sms', 'portal'] as const;
