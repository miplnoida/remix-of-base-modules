/**
 * Approval / Override Policy types — single source of truth.
 *
 * Every Benefits action that may need supervisor approval or an
 * "override" goes through `bnPolicyEvaluator` + `bnPolicyActionHandler`.
 * The shapes below describe what those modules consume and return.
 */

export const POLICY_AREAS = [
  'ELIGIBILITY',
  'CALCULATION',
  'DOCUMENTS',
  'AMENDMENTS',
  'PARTICIPANTS',
  'WORKFLOW',
  'AWARD',
  'PAYMENT',
  'COMMUNICATION',
] as const;
export type PolicyArea = (typeof POLICY_AREAS)[number];

export type OverrideStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'SUPERSEDED';

export type PolicyActionKind = 'REQUEST' | 'APPROVE' | 'APPLY';

export interface ApprovalPolicy {
  id: string;
  product_version_id: string;
  policy_area: PolicyArea;
  action_code: string;

  is_enabled: boolean;
  requires_reason_code: boolean;
  requires_justification: boolean;
  requires_document: boolean;
  requires_supervisor_approval: boolean;
  self_approval_allowed: boolean;
  audit_required: boolean;
  non_waivable: boolean;

  approval_role: string | null;
  approval_workbasket_id: string | null;
  reason_code_group: string | null;

  allowed_statuses: string[];
  blocked_statuses: string[];
  allowed_rule_codes: string[];
  blocked_rule_codes: string[];

  max_override_amount: number | null;
  max_override_percent: number | null;
  expiry_status: string | null;

  notes: string | null;
}

export interface PolicyContext {
  claimId: string;
  productVersionId: string;
  area: PolicyArea;
  actionCode?: string;
  actionKind: PolicyActionKind;

  userId: string;          // user_code of the actor
  userRoles: string[];     // role codes (uppercased)
  claimStatus?: string;
  applicationChannel?: string;

  ruleCode?: string;
  amount?: number;
  reasonCode?: string;

  /** For APPROVE: the user_code of whoever originally requested it */
  requesterUserId?: string;
}

export interface PolicyDecision {
  allowed: boolean;
  policy: ApprovalPolicy | null;
  reasons: string[];
  requires: {
    reasonCode: boolean;
    justification: boolean;
    document: boolean;
    supervisorApproval: boolean;
  };
  approverRole?: string | null;
  workbasketId?: string | null;
}

export interface OverrideRequest {
  id: string;
  claim_id: string;
  product_version_id: string;
  policy_area: PolicyArea;
  action_code: string;
  target_entity_type: string | null;
  target_entity_id: string | null;
  rule_code: string | null;
  current_value: unknown;
  requested_value: unknown;
  reason_code: string | null;
  justification: string | null;
  supporting_document_id: string | null;
  status: OverrideStatus;
  requested_by: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_decision: string | null;
  review_notes: string | null;
  applied_at: string | null;
  applied_by: string | null;
  expires_at: string | null;
  policy_id: string | null;
  revoked_by?: string | null;
  revoked_at?: string | null;
  revocation_reason?: string | null;
}

export interface SubmitOverrideInput {
  claimId: string;
  productVersionId: string;
  area: PolicyArea;
  actionCode?: string;
  targetEntityType?: string;
  targetEntityId?: string;
  ruleCode?: string;
  currentValue?: unknown;
  requestedValue?: unknown;
  reasonCode?: string;
  justification?: string;
  supportingDocumentId?: string;
  amount?: number;
  claimStatus?: string;
  applicationChannel?: string;
  requestedBy: string;
  requestedByRoles: string[];
}

export interface ReviewOverrideInput {
  requestId: string;
  decision: 'APPROVED' | 'REJECTED';
  notes?: string;
  reviewedBy: string;
  reviewerRoles: string[];
}
