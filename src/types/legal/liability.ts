/**
 * EPIC-06A — Recoverable Liability Foundation
 * Types for lg_recoverable_liability and its junctions.
 */

export type LiabilitySourceModule =
  | "COMPLIANCE" | "ER" | "BENEFITS" | "FINANCE"
  | "AUDIT" | "FRAUD" | "MANUAL" | "OTHER";

export type LiabilityType =
  | "SS_CONTRIB" | "HOUSING_LEVY" | "SEVERANCE"
  | "BN_OVERPAYMENT" | "PENSION_RECOVERY"
  | "PENALTY" | "INTEREST"
  | "COURT_COST" | "LEGAL_COST" | "ADMIN_COST" | "OTHER";

export type FundType =
  | "SOCIAL_SECURITY" | "HOUSING" | "SEVERANCE" | "BENEFIT" | "OTHER";

export type LiabilityLegalStatus =
  | "DRAFT" | "REFERRED" | "IN_INTAKE" | "ACTIVE"
  | "IN_HEARING" | "ORDER_ISSUED" | "SETTLED"
  | "APPEALED" | "ENFORCEMENT" | "CLOSED";

export type LiabilityRecoveryStatus =
  | "PENDING" | "PARTIAL" | "RECOVERED" | "WRITTEN_OFF" | "BREACHED";

export type LiabilityRowStatus = "ACTIVE" | "CLOSED" | "MERGED" | "SPLIT" | "WRITTEN_OFF";

export type AllocationRule =
  | "PRINCIPAL_FIRST" | "INTEREST_FIRST" | "PENALTY_FIRST"
  | "OLDEST_FIRST" | "MANUAL";

export type AllocationComponent =
  | "PRINCIPAL" | "INTEREST" | "PENALTY"
  | "COURT_COST" | "LEGAL_COST" | "OTHER";

export interface RecoverableLiability {
  id: string;
  lg_case_id: string;
  source_module: LiabilitySourceModule;
  source_record_id: string | null;
  source_reference: string | null;
  originating_department: string | null;
  assessment_number: string | null;
  assessment_date: string | null;
  liability_type: LiabilityType;
  fund_type: FundType | null;
  statutory_basis: string | null;
  contribution_period_from: string | null;
  contribution_period_to: string | null;
  assessment_period: string | null;
  employer_id: string | null;
  insured_person_id: string | null;
  principal: number;
  interest: number;
  penalty: number;
  court_cost: number;
  legal_cost: number;
  other_cost: number;
  total_assessed: number;
  paid: number;
  outstanding: number;
  currency: string;
  exchange_rate: number;
  allocation_rule: AllocationRule | null;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT" | null;
  legal_status: LiabilityLegalStatus;
  recovery_status: LiabilityRecoveryStatus;
  hearing_status: string | null;
  order_status: string | null;
  arrangement_status: string | null;
  settlement_status: string | null;
  appeal_status: string | null;
  enforcement_status: string | null;
  writeoff_status: string | null;
  limitation_date: string | null;
  recovery_sequence: number | null;
  remarks: string | null;
  status: LiabilityRowStatus;
  merged_into_id: string | null;
  split_from_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface LiabilityPaymentAllocation {
  id: string;
  liability_id: string;
  payment_id: string;
  payment_ref: string | null;
  payment_date: string | null;
  allocated_amount: number;
  component: AllocationComponent | null;
  allocation_rule: AllocationRule | null;
  remarks: string | null;
  created_at: string;
  created_by: string | null;
}

export interface CreateLiabilityInput {
  lg_case_id: string;
  source_module: LiabilitySourceModule;
  source_record_id?: string | null;
  source_reference?: string | null;
  originating_department?: string | null;
  assessment_number?: string | null;
  assessment_date?: string | null;
  liability_type: LiabilityType;
  fund_type?: FundType | null;
  statutory_basis?: string | null;
  contribution_period_from?: string | null;
  contribution_period_to?: string | null;
  employer_id?: string | null;
  insured_person_id?: string | null;
  principal?: number;
  interest?: number;
  penalty?: number;
  court_cost?: number;
  legal_cost?: number;
  other_cost?: number;
  currency?: string;
  limitation_date?: string | null;
  remarks?: string | null;
}
