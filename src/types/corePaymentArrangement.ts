// Central Payment Arrangement (cross-module: Compliance / Legal / Benefits / Finance)

export type ArrangementDebtorType = "EMPLOYER" | "INSURED_PERSON" | "BENEFICIARY" | "OTHER";
export type ArrangementSourceModule = "COMPLIANCE" | "LEGAL" | "BENEFITS" | "FINANCE";
export type ArrangementType =
  | "VOLUNTARY"
  | "COMPLIANCE_PLAN"
  | "LEGAL_PRE_COURT"
  | "LEGAL_COURT_ORDERED"
  | "LEGAL_POST_JUDGMENT"
  | "ENFORCEMENT_PLAN"
  | "BENEFIT_OVERPAYMENT_RECOVERY";
export type ArrangementStatus =
  | "DRAFT" | "PENDING_APPROVAL" | "ACTIVE" | "DEFAULTED" | "SUPERSEDED" | "COMPLETED" | "CANCELLED";
export type ArrangementFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY";
export type InstallmentStatus = "PLANNED" | "DUE" | "PARTIAL" | "PAID" | "MISSED" | "DEFAULTED" | "WAIVED";
export type LiabilityType =
  | "SS" | "LV" | "PE" | "BENEFIT_OVERPAYMENT" | "FINANCE_DEBT" | "COST" | "PENALTY" | "OTHER";
export type ItemSourceRecordType =
  | "CASE" | "LEGAL_ACTION" | "COURT_PROCEEDING" | "CLAIM" | "OVERPAYMENT" | "DEBT" | "VIOLATION" | "OTHER";

export interface CorePaymentArrangement {
  id: string;
  arrangement_no: string;
  debtor_type: ArrangementDebtorType;
  debtor_id: string;
  debtor_name: string | null;
  source_module_created_by: ArrangementSourceModule;
  arrangement_type: ArrangementType;
  status: ArrangementStatus;
  frequency: ArrangementFrequency;
  start_date: string;
  end_date: string | null;
  total_arranged_amount: number;
  down_payment_amount: number;
  installment_amount: number;
  number_of_installments: number;
  total_paid: number;
  outstanding_balance: number;
  default_date: string | null;
  default_reason: string | null;
  superseded_by_arrangement_id: string | null;
  superseded_from_arrangement_id: string | null;
  terms_text: string | null;
  legacy_ce_arrangement_id: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CorePaymentArrangementItem {
  id: string;
  arrangement_id: string;
  source_module: ArrangementSourceModule;
  source_record_type: ItemSourceRecordType;
  source_record_id: string;
  source_reference_no: string | null;
  compliance_case_id: string | null;
  legal_case_id: string | null;
  legal_action_id: string | null;
  court_proceeding_id: string | null;
  benefit_claim_id: string | null;
  finance_debt_id: string | null;
  liability_type: LiabilityType;
  period_from: string | null;
  period_to: string | null;
  principal_amount: number;
  penalty_amount: number;
  cost_amount: number;
  arranged_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: "OPEN" | "PARTIAL" | "PAID" | "CANCELLED" | "SUPERSEDED";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CorePaymentInstallment {
  id: string;
  arrangement_id: string;
  installment_no: number;
  due_date: string;
  due_amount: number;
  paid_amount: number;
  paid_date: string | null;
  status: InstallmentStatus;
  receipt_id: string | null;
  notes: string | null;
}

export interface CorePaymentAllocation {
  id: string;
  arrangement_id: string;
  installment_id: string | null;
  receipt_id: string | null;
  payment_date: string;
  amount_received: number;
  allocated_to_item_id: string | null;
  allocation_amount: number;
  allocation_order: number;
  source_module: ArrangementSourceModule | null;
  source_record_id: string | null;
}

export interface ArrangementStatusHistoryRow {
  id: string;
  arrangement_id: string;
  from_status: ArrangementStatus | null;
  to_status: ArrangementStatus;
  source_module: ArrangementSourceModule | null;
  reason: string | null;
  performed_by: string | null;
  performed_at: string;
}

export interface CreateCoreArrangementInput {
  debtor_type?: ArrangementDebtorType;
  debtor_id: string;
  debtor_name?: string | null;
  source_module_created_by: ArrangementSourceModule;
  arrangement_type: ArrangementType;
  frequency: ArrangementFrequency;
  start_date: string;
  down_payment_amount?: number;
  number_of_installments: number;
  terms_text?: string | null;
  items: Array<Omit<CorePaymentArrangementItem,
    "id" | "arrangement_id" | "paid_amount" | "outstanding_amount" | "status" | "created_at" | "updated_at"> & {
      paid_amount?: number;
      outstanding_amount?: number;
      status?: CorePaymentArrangementItem["status"];
    }>;
  legacy_ce_arrangement_id?: string | null;
  superseded_from_arrangement_id?: string | null;
}
