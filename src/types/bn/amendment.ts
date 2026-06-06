/**
 * Claim amendment policy / field ownership / correction types.
 * Backed by:
 *   - public.bn_product_amendment_policy
 *   - public.bn_claim_field_ownership
 *   - public.bn_claim_amendment_log
 *   - public.bn_claim_correction_request / _field
 */

export type ApplicationChannel =
  | 'PUBLIC_ONLINE'
  | 'STAFF_OFFLINE'
  | 'ASSISTED_COUNTER'
  | 'BACK_OFFICE_ENTRY'
  | 'MIGRATED_LEGACY';

export const APPLICATION_CHANNEL_LABEL: Record<ApplicationChannel, string> = {
  PUBLIC_ONLINE: 'Public Online',
  STAFF_OFFLINE: 'Staff Offline',
  ASSISTED_COUNTER: 'Assisted Counter',
  BACK_OFFICE_ENTRY: 'Back Office',
  MIGRATED_LEGACY: 'Migrated / Legacy',
};

export type FieldOwner =
  | 'APPLICANT_SUBMITTED'
  | 'STAFF_REVIEW'
  | 'EMPLOYER_SUBMITTED'
  | 'DOCTOR_SUBMITTED'
  | 'SYSTEM_DERIVED'
  | 'DECISION_FIELD'
  | 'PAYMENT_FIELD';

export type FieldArea =
  | 'PARTICIPANTS'
  | 'BENEFIT_FACTS'
  | 'DOCUMENTS'
  | 'PAYMENT'
  | 'CALC_INPUTS'
  | 'DECISION';

export interface AmendmentPolicy {
  id: string;
  product_version_id: string;
  allow_officer_amendments: boolean;
  allow_public_corrections: boolean;
  allow_participant_amendments: boolean;
  editable_until_status: string;
  lock_after_eligibility: boolean;
  lock_after_calculation: boolean;
  lock_after_decision: boolean;
  lock_after_approval: boolean;
  lock_after_payment: boolean;
  requires_reason_for_amendment: boolean;
  requires_supervisor_approval_for_locked_changes: boolean;
  participant_details_editable_until: string;
  benefit_facts_editable_until: string;
  document_details_editable_until: string;
  payment_details_editable_until: string;
  calculation_inputs_editable_until: string;
}

export interface FieldOwnership {
  id: string;
  product_version_id: string;
  field_key: string;
  field_label: string | null;
  field_area: FieldArea;
  field_owner: FieldOwner;
  editable_channels: ApplicationChannel[];
  editable_until_status: string;
  requires_reason: boolean;
  requires_supervisor_approval: boolean;
  affects_eligibility: boolean;
  affects_calculation: boolean;
}

export interface AreaEditability {
  editable: boolean;
  lockedReason?: string;
  requiresCorrection?: boolean;
}

export interface ClaimEditability {
  channel: ApplicationChannel;
  status: string;
  policy: AmendmentPolicy | null;
  /** map of FieldArea → editability */
  areas: Record<FieldArea, AreaEditability>;
  /** human-readable list of locked reasons for the banner */
  lockedReasons: string[];
  canRequestCorrection: boolean;
  canSupervisorOverride: boolean;
  /** convenience: any area still editable */
  anyEditable: boolean;
}

export interface AmendmentLogRow {
  id: string;
  claim_id: string;
  field_key: string;
  field_area: string | null;
  before_value: unknown;
  after_value: unknown;
  reason: string | null;
  amended_by: string;
  amended_at: string;
  source_channel: ApplicationChannel;
  claim_status_at_change: string | null;
  approval_status: 'APPLIED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
}

export interface CorrectionRequestRow {
  id: string;
  claim_id: string;
  requested_by: string;
  requested_at: string;
  message: string;
  status: 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  submitted_by: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  source_channel: ApplicationChannel;
}

export interface CorrectionFieldRow {
  id: string;
  request_id: string;
  field_key: string;
  field_label: string | null;
  current_value: unknown;
  proposed_value: unknown;
  field_status: 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  notes: string | null;
}
