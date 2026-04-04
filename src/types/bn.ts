// ============================================================
// Benefit Management Module - Phase 1 Types
// ============================================================

// --- Enums ---

export type BnClaimStatus =
  | 'DRAFT' | 'SUBMITTED' | 'INTAKE_REVIEW' | 'ELIGIBILITY_CHECK'
  | 'EVIDENCE_REVIEW' | 'CALCULATION' | 'DECISION' | 'APPROVED'
  | 'DENIED' | 'AWARD_SETUP' | 'PAYMENT_QUEUE' | 'IN_PAYMENT'
  | 'SUSPENDED' | 'CLOSED' | 'PENDING_INFO' | 'WITHDRAWN';

export type BnProductStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export type BnProductCategory = 'SHORT_TERM' | 'LONG_TERM' | 'NON_CONTRIBUTORY' | 'GRANT';

export type BnPaymentType = 'PERIODIC' | 'LUMP_SUM' | 'BOTH';

export type BnClaimPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type BnClaimSource = 'WALK_IN' | 'PAPER' | 'ONLINE' | 'LEGACY';

// --- Product Catalog ---

export interface BnProduct {
  id: string;
  benefit_code: string;
  benefit_name: string;
  description: string | null;
  category: string;
  branch: string;
  payment_type: string;
  country_code: string;
  status: BnProductStatus;
  sort_order: number;
  entered_by: string | null;
  modified_by: string | null;
  entered_at: string;
  modified_at: string;
}

export interface BnProductVersion {
  id: string;
  product_id: string;
  version_number: number;
  effective_from: string;
  effective_to: string | null;
  description: string | null;
  eligibility_config: Record<string, unknown>;
  calculation_config: Record<string, unknown>;
  timeline_config: Record<string, unknown>;
  workflow_scheme: string | null;
  requires_employer_verification: boolean;
  requires_medical_board_review: boolean;
  requires_means_test: boolean;
  max_concurrent_claims: number;
  status: BnProductStatus;
  entered_by: string | null;
  modified_by: string | null;
  entered_at: string;
  modified_at: string;
}

export interface BnEligibilityRule {
  id: string;
  product_version_id: string;
  rule_code: string;
  rule_name: string;
  rule_type: string;
  rule_group: string;
  rule_definition: Record<string, unknown>;
  fail_message: string | null;
  sort_order: number;
  is_active: boolean;
  entered_by: string | null;
  entered_at: string;
}

export interface BnCalculationRule {
  id: string;
  product_version_id: string;
  rule_code: string;
  rule_name: string;
  calc_type: string;
  formula_definition: Record<string, unknown>;
  variables: unknown[];
  limits: Record<string, unknown>;
  rounding_rule: string;
  sort_order: number;
  is_active: boolean;
  entered_by: string | null;
  entered_at: string;
}

export interface BnTimelineRule {
  id: string;
  product_version_id: string;
  rule_code: string;
  rule_name: string;
  timeline_type: string;
  days_value: number | null;
  weeks_value: number | null;
  months_value: number | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  entered_by: string | null;
  entered_at: string;
}

export interface BnDocumentRule {
  id: string;
  product_id: string;
  document_type_code: string;
  document_name: string;
  description: string | null;
  is_mandatory: boolean;
  stage: string;
  sort_order: number;
  is_active: boolean;
  entered_by: string | null;
  entered_at: string;
}

// --- Claim ---

export interface BnClaim {
  id: string;
  claim_number: string | null;
  ssn: string;
  product_id: string;
  product_version_id: string | null;
  employer_regno: string | null;
  status: BnClaimStatus;
  priority: string;
  claim_date: string;
  submission_date: string | null;
  decision_date: string | null;
  source: string;
  legacy_claim_ref: string | null;
  workflow_instance_id: string | null;
  assigned_to: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  bank_account: string | null;
  bank_routing_number: string | null;
  declaration: boolean;
  digital_signature: string | null;
  entered_by: string | null;
  modified_by: string | null;
  entered_at: string;
  modified_at: string;
  // Joined fields
  bn_product?: BnProduct;
}

export interface BnClaimDetail {
  id: string;
  claim_id: string;
  detail_json: Record<string, unknown>;
  entered_by: string | null;
  modified_by: string | null;
  entered_at: string;
  modified_at: string;
}

export interface BnClaimDocument {
  id: string;
  claim_id: string;
  document_type_code: string;
  document_name: string | null;
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  entered_by: string | null;
  entered_at: string;
}

export interface BnClaimEvent {
  id: string;
  claim_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  notes: string | null;
  performed_by: string;
  performed_at: string;
  metadata: Record<string, unknown>;
}

export interface BnClaimEligibility {
  id: string;
  claim_id: string;
  product_version_id: string | null;
  check_date: string;
  overall_result: boolean;
  rule_results: BnEligibilityRuleResult[];
  contribution_summary: Record<string, unknown>;
  override_applied: boolean;
  override_by: string | null;
  override_reason: string | null;
  entered_by: string | null;
  entered_at: string;
}

export interface BnEligibilityRuleResult {
  rule_code: string;
  rule_name: string;
  passed: boolean;
  actual_value: unknown;
  required_value: unknown;
  message: string;
}

export interface BnClaimCalculation {
  id: string;
  claim_id: string;
  product_version_id: string | null;
  calc_date: string;
  weekly_rate: number | null;
  monthly_rate: number | null;
  lump_sum: number | null;
  calculation_steps: BnCalculationStep[];
  variables_used: Record<string, unknown>;
  override_applied: boolean;
  override_by: string | null;
  override_reason: string | null;
  entered_by: string | null;
  entered_at: string;
}

export interface BnCalculationStep {
  step_number: number;
  description: string;
  formula: string;
  inputs: Record<string, unknown>;
  result: number;
}

export interface BnClaimNote {
  id: string;
  claim_id: string;
  note_type: string;
  subject: string | null;
  body: string;
  is_internal: boolean;
  entered_by: string;
  entered_at: string;
}

// --- Contribution Summary (from RPC) ---

export interface BnContributionSummary {
  total_weeks: number;
  total_wages: number;
  avg_weekly_wages: number;
}

// --- Status display helpers ---

export const BN_CLAIM_STATUS_LABELS: Record<BnClaimStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  INTAKE_REVIEW: 'Intake Review',
  ELIGIBILITY_CHECK: 'Eligibility Check',
  EVIDENCE_REVIEW: 'Evidence Review',
  CALCULATION: 'Calculation',
  DECISION: 'Decision',
  APPROVED: 'Approved',
  DENIED: 'Denied',
  AWARD_SETUP: 'Award Setup',
  PAYMENT_QUEUE: 'Payment Queue',
  IN_PAYMENT: 'In Payment',
  SUSPENDED: 'Suspended',
  CLOSED: 'Closed',
  PENDING_INFO: 'Pending Info',
  WITHDRAWN: 'Withdrawn',
};

export const BN_PRODUCT_STATUS_LABELS: Record<BnProductStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  ARCHIVED: 'Archived',
};
