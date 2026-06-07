/**
 * Shared types for the unified BN Payment Details framework.
 * Used by claimant portal, public application, internal intake, Claim Workbench,
 * Entitlement setup, Payment Preparation and the EFT Update service.
 */

export type BnPaymentMethod = 'EFT' | 'CHEQUE' | 'CASH_PICKUP' | 'INTERNAL_TRANSFER';

export type BnPaymentVerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export type BnPaymentChannel =
  | 'PUBLIC_ONLINE'
  | 'STAFF_OFFLINE'
  | 'ASSISTED_COUNTER'
  | 'CLAIM_WORKBENCH'
  | 'EFT_UPDATE_SERVICE'
  | 'CLAIMANT_PORTAL';

export type BnPaymentChangeRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface BnPostalAddress {
  line1?: string;
  line2?: string;
  city?: string;
  parish?: string;
  postal_code?: string;
  country?: string;
}

export interface BnPaymentProfile {
  id: string;
  person_ssn: string;
  payee_id: string | null;
  payment_method: BnPaymentMethod;
  bank_name: string | null;
  bank_code: string | null;
  branch_name: string | null;
  branch_code: string | null;
  account_number_masked: string | null;
  account_number_token: string | null;
  account_holder_name: string | null;
  account_holder_relationship: string | null;
  account_type: string | null;
  payment_currency: string;
  postal_address_snapshot: BnPostalAddress | null;
  verification_status: BnPaymentVerificationStatus;
  verified_by: string | null;
  verified_at: string | null;
  active: boolean;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
  entered_by: string | null;
  entered_at: string;
  modified_by: string | null;
  modified_at: string | null;
  created_at: string;
  updated_at: string;
}

export type BnPaymentProfileDraft = Partial<
  Omit<BnPaymentProfile, 'id' | 'created_at' | 'updated_at' | 'entered_at'>
> & {
  payment_method: BnPaymentMethod;
  person_ssn: string;
  payment_currency?: string;
};

export interface BnPaymentProfileChangeRequest {
  id: string;
  profile_id: string | null;
  person_ssn: string;
  claim_id: string | null;
  entitlement_id: string | null;
  requested_by: string | null;
  channel: BnPaymentChannel;
  old_profile_snapshot: Partial<BnPaymentProfile> | null;
  new_profile_snapshot: BnPaymentProfileDraft;
  status: BnPaymentChangeRequestStatus;
  reason: string | null;
  proof_document_ids: string[];
  approved_by: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string;
}

/** Product-level payment policy (from bn_product_channel_config). */
export interface BnPaymentPolicy {
  allowed_payment_methods: BnPaymentMethod[];
  default_payment_method: BnPaymentMethod | null;
  payment_required_at_application: boolean;
  payment_required_before_approval: boolean;
  payment_required_before_payment: boolean;
  allow_third_party_payee: boolean;
  allow_guardian_payee: boolean;
  require_bank_verification: boolean;
  require_supervisor_approval_for_change: boolean;
  require_proof_for_change: boolean;
  cheque_address_required: boolean;
}

export const DEFAULT_PAYMENT_POLICY: BnPaymentPolicy = {
  allowed_payment_methods: ['EFT', 'CHEQUE'],
  default_payment_method: 'EFT',
  payment_required_at_application: false,
  payment_required_before_approval: false,
  payment_required_before_payment: true,
  allow_third_party_payee: false,
  allow_guardian_payee: false,
  require_bank_verification: true,
  require_supervisor_approval_for_change: false,
  require_proof_for_change: false,
  cheque_address_required: true,
};

export function maskAccount(accountNumber: string | null | undefined): string | null {
  if (!accountNumber) return null;
  const digits = String(accountNumber).replace(/\s+/g, '');
  if (digits.length <= 4) return `••${digits}`;
  return `${'•'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}
