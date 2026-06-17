// Medical Benefit Setup — domain types
export type JurisdictionLevel = 'LOCAL' | 'REGIONAL' | 'INTERNATIONAL';
export type JurisdictionLevelExt = JurisdictionLevel | 'ANY';
export type AvailabilityStatus = 'AVAILABLE' | 'LIMITED' | 'NOT_AVAILABLE';
export type CapType = 'PER_CLAIM' | 'PER_PROCEDURE' | 'PER_EXPENSE' | 'ANNUAL' | 'LIFETIME';

export interface BnMedicalProcedure {
  id?: string;
  procedure_code: string;
  procedure_name: string;
  category?: string | null;
  specialty?: string | null;
  requires_pre_authorization?: boolean;
  requires_medical_board?: boolean;
  country_code: string;
  effective_from: string;
  effective_to?: string | null;
  is_active?: boolean;
  description?: string | null;
}

export interface BnMedicalFacility {
  id?: string;
  facility_code: string;
  facility_name: string;
  country_code: string;
  jurisdiction_level: JurisdictionLevel;
  provider_type?: string | null;
  is_approved?: boolean;
  effective_from: string;
  effective_to?: string | null;
  is_active?: boolean;
  address?: string | null;
}

export interface BnMedicalFacilityProcedure {
  id?: string;
  facility_id: string;
  procedure_id: string;
  availability_status: AvailabilityStatus;
  notes?: string | null;
  effective_from: string;
  effective_to?: string | null;
}

export interface BnMedicalReferralRule {
  id?: string;
  procedure_id: string;
  country_code: string;
  local_available_action: string;
  regional_available_action: string;
  international_action: string;
  requires_specialist_report?: boolean;
  requires_board_approval?: boolean;
  requires_pre_authorization?: boolean;
  rule_definition?: Record<string, unknown> | null;
  effective_from: string;
  effective_to?: string | null;
  is_active?: boolean;
}

export interface BnMedicalExpenseType {
  id?: string;
  expense_code: string;
  expense_name: string;
  category?: string | null;
  reimbursable?: boolean;
  requires_receipt?: boolean;
  requires_invoice?: boolean;
  default_cap?: number | null;
  country_code: string;
  is_active?: boolean;
  description?: string | null;
}

export type MedicalLocationCode =
  | 'LOCAL_ST_KITTS' | 'NEVIS' | 'CARIBBEAN' | 'INTERNATIONAL' | 'ANY';

export type MedicalReimbursementMethod =
  | 'FIXED_AMOUNT' | 'PERCENTAGE_UP_TO_CEILING' | 'ACTUAL_UP_TO_CEILING'
  | 'FULL_REIMBURSEMENT' | 'NOT_COVERED';

export interface BnMedicalReimbursementLimit {
  id?: string;
  procedure_id?: string | null;
  expense_type_id?: string | null;
  country_code: string;
  jurisdiction_level: JurisdictionLevelExt;
  cap_type: CapType;
  cap_amount: number;
  reimbursement_percent: number;
  currency_code: string;
  effective_from: string;
  effective_to?: string | null;
  is_active?: boolean;
  notes?: string | null;
  // Extended policy fields (Phase B)
  location_code?: MedicalLocationCode | null;
  provider_type_code?: string | null;
  beneficiary_type?: string | null;
  reimbursement_method?: MedicalReimbursementMethod | null;
  fixed_amount?: number | null;
  ceiling_amount?: number | null;
  referral_required?: boolean | null;
  pre_authorization_required?: boolean | null;
  emergency_allowed?: boolean | null;
  approval_level?: string | null;
  procedure_code?: string | null;
  legal_reference?: string | null;
}

export interface BnMedicalClaimExpense {
  id?: string;
  claim_id: string;
  procedure_id?: string | null;
  expense_type_id?: string | null;
  jurisdiction_level?: JurisdictionLevel | null;
  claimed_amount: number;
  approved_amount?: number | null;
  currency_code: string;
  receipt_document_id?: string | null;
  provider_name?: string | null;
  service_date?: string | null;
  status?: string;
}

export interface BnMedicalReimbursementCalc {
  id?: string;
  claim_id: string;
  calculation_number: number;
  total_claimed: number;
  total_approved: number;
  total_payable: number;
  cap_applied?: string | null;
  calculation_trace?: unknown;
  calculated_by?: string | null;
  calculated_at?: string;
}

export interface BnMedicalRecommendation {
  id?: string;
  claim_id: string;
  procedure_id?: string | null;
  recommendation_level: JurisdictionLevel;
  recommended_facility_id?: string | null;
  recommended_country_code?: string | null;
  recommendation_reason?: string | null;
  specialist_name?: string | null;
  board_decision?: string | null;
  status?: string;
  approved_by?: string | null;
  approved_at?: string | null;
}
