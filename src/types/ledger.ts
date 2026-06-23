// Central Employer Ledger types

export type LedgerFundCode = "SS" | "LV" | "PE" | "LEGAL" | "COURT" | "OTHER";
export type LedgerHeadType =
  | "CONTRIBUTION"
  | "PENALTY"
  | "FINE"
  | "INTEREST"
  | "LEGAL_FEE"
  | "COURT_COST"
  | "PAYMENT"
  | "ADJUSTMENT";
export type LedgerSourceModule =
  | "BEMA"
  | "C3"
  | "COMPLIANCE"
  | "LEGAL"
  | "PAYMENTS"
  | "FINANCE"
  | "MIGRATION";
export type LedgerPostingStatus = "DRAFT" | "POSTED" | "REVERSED" | "ADJUSTED";
export type RecalculationMode = "PREVIEW" | "POST_ADJUSTMENTS" | "FULL_REBUILD_PREVIEW";

export interface LedgerHead {
  head_code: string;
  head_name: string;
  fund_code: LedgerFundCode;
  head_type: LedgerHeadType;
  is_principal: boolean;
  is_waivable: boolean;
  allocation_priority: number;
  is_active: boolean;
}

export interface LedgerAccount {
  id: string;
  employer_id: string;
  employer_no: string;
  employer_name: string | null;
  country_code: string;
  status: string;
  opened_at: string;
  closed_at: string | null;
}

export interface LedgerTransactionInput {
  employer_id: string;
  employer_no: string;
  posting_period: string; // YYYY-MM-01
  head_code: string;
  debit_amount?: number;
  credit_amount?: number;
  source_module: LedgerSourceModule;
  source_record_type?: string;
  source_record_id?: string;
  source_reference_no?: string;
  payment_code?: string;
  mop_code?: string;
  receipt_id?: string;
  payment_id?: string;
  legal_case_id?: string;
  legal_action_id?: string;
  compliance_case_id?: string;
  payment_arrangement_id?: string;
  description?: string;
  posting_status?: LedgerPostingStatus;
  recalculation_run_id?: string;
  created_by?: string;
  transaction_date?: string;
}

export interface LedgerTransaction extends LedgerTransactionInput {
  id: string;
  transaction_no: number;
  employer_ledger_account_id: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number | null;
  posting_status: LedgerPostingStatus;
  reversed_transaction_id: string | null;
  created_at: string;
}

export interface LedgerBalance {
  employer_id: string;
  posting_period: string;
  head_code: string;
  opening_balance: number;
  debit_total: number;
  credit_total: number;
  closing_balance: number;
  last_calculated_at: string;
}

export interface PaymentAllocationRule {
  rule_code: string;
  country_code: string;
  debtor_type: string;
  allocation_order: number;
  head_code: string;
  oldest_period_first: boolean;
  is_active: boolean;
}

export interface RecalculationRun {
  id: string;
  employer_id: string | null;
  period_from: string | null;
  period_to: string | null;
  reason: string | null;
  recalculation_mode: RecalculationMode;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  diff_summary: any;
  run_by: string | null;
  started_at: string;
  completed_at: string | null;
}
