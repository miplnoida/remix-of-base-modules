/**
 * EPIC-07 — Post-Judgment Legal Recovery
 * Unified type surface for all post-judgment domains.
 * All statuses are string literals to remain compatible with DB TEXT columns.
 */

// ---------- Judgment Compliance ----------
export type JudgmentComplianceStatus =
  | "PENDING" | "IN_PROGRESS" | "PARTIAL" | "COMPLIED"
  | "BREACHED" | "OVERDUE" | "CLOSED" | "OVERRIDDEN";

export interface JudgmentCompliance {
  id: string;
  order_id: string;
  case_id: string;
  ordered_amount: number;
  interest_amount: number;
  court_costs: number;
  partial_compliance_amount: number;
  compliance_due_date: string | null;
  compliance_status: JudgmentComplianceStatus;
  compliance_officer_id: string | null;
  compliance_evidence: Array<{ document_id?: string; note?: string; recorded_at?: string }>;
  compliance_notes: string | null;
  closed_at: string | null;
  closed_by: string | null;
  override_reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

// ---------- Consent Orders ----------
export type ConsentOrderStatus =
  | "DRAFT" | "PENDING_COURT_APPROVAL" | "ACTIVE"
  | "BREACHED" | "COMPLETED" | "CANCELLED";

export type ConsentInstallmentStatus =
  | "PENDING" | "PAID" | "PARTIAL" | "MISSED" | "WAIVED";

export type ConsentVariationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type BreachRecommendation =
  | "FURTHER_ENFORCEMENT" | "VARIATION" | "COURT_APPLICATION" | null;

export interface ConsentOrder {
  id: string;
  case_id: string;
  order_id: string | null;
  code: string;
  title: string;
  total_amount: number;
  paid_amount: number;
  installment_count: number;
  missed_installments: number;
  start_date: string | null;
  end_date: string | null;
  court_approval_required: boolean;
  court_approved_at: string | null;
  status: ConsentOrderStatus;
  breach_recommendation: BreachRecommendation;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsentInstallment {
  id: string;
  consent_order_id: string;
  seq: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  paid_at: string | null;
  status: ConsentInstallmentStatus;
  notes: string | null;
}

export interface ConsentVariation {
  id: string;
  consent_order_id: string;
  variation_type: string;
  requested_by: string | null;
  requested_at: string;
  reason: string | null;
  proposed_terms: Record<string, unknown> | null;
  status: ConsentVariationStatus;
  decided_by: string | null;
  decided_at: string | null;
  decision_notes: string | null;
}

// ---------- Legal Settlement (EPIC-07 extended states) ----------
export type LegalSettlementStatus =
  | "DRAFT" | "NEGOTIATION" | "BOARD_REVIEW"
  | "APPROVED" | "REJECTED"
  | "COURT_APPROVAL_REQUIRED" | "COURT_APPROVED"
  | "EXECUTED" | "BREACHED" | "CLOSED";

// ---------- External Counsel ----------
export interface ExternalCounsel {
  id: string;
  code: string;
  law_firm_name: string;
  primary_attorney: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  practice_areas: string[] | null;
  is_active: boolean;
  performance_rating: number | null;
  notes: string | null;
}

export type CounselEngagementStatus = "ACTIVE" | "CONCLUDED" | "TERMINATED";

export interface ExternalCounselEngagement {
  id: string;
  case_id: string;
  counsel_id: string;
  engaged_at: string;
  disengaged_at: string | null;
  instructions: string | null;
  deliverables: Array<{ label: string; due_date?: string; status?: string }>;
  status: CounselEngagementStatus;
  fee_estimate: number | null;
  fee_incurred: number;
  notes: string | null;
}

export type CounselInvoiceStatus = "RECEIVED" | "APPROVED" | "PAID" | "DISPUTED";

export interface ExternalCounselInvoice {
  id: string;
  engagement_id: string;
  invoice_number: string;
  invoice_date: string;
  amount: number;
  tax_amount: number;
  status: CounselInvoiceStatus;
  paid_at: string | null;
  is_recoverable: boolean;
  notes: string | null;
}

// ---------- Court Filing ----------
export type CourtFilingType =
  | "APPLICATION" | "AFFIDAVIT" | "REPLY" | "WITNESS_STATEMENT"
  | "EVIDENCE_BUNDLE" | "MOTION" | "APPEAL" | "VARIATION" | "EXECUTION";

export type CourtFilingStatus =
  | "DRAFT" | "FILED" | "SERVED" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";

export interface CourtFiling {
  id: string;
  case_id: string;
  code: string;
  filing_type: CourtFilingType;
  title: string;
  court_id: string | null;
  filed_at: string | null;
  served_at: string | null;
  deadline: string | null;
  court_date: string | null;
  status: CourtFilingStatus;
  outcome: string | null;
  filed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- Legal Cost ----------
export type LegalCostType =
  | "COURT_FEE" | "ATTORNEY_FEE" | "EXECUTION_COST"
  | "SERVICE_COST" | "INTEREST_AWARDED" | "OTHER";

export type LegalCostStatus = "OUTSTANDING" | "PARTIAL" | "RECOVERED" | "WRITTEN_OFF";

export interface LegalCost {
  id: string;
  case_id: string;
  cost_type: LegalCostType;
  description: string | null;
  incurred_date: string;
  amount: number;
  recovered_amount: number;
  is_court_awarded: boolean;
  linked_filing_id: string | null;
  linked_engagement_id: string | null;
  status: LegalCostStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- Recovery Health (EPIC-07 extension) ----------
export type PostJudgmentHealth =
  | "HEALTHY" | "COMPLIANCE_DUE" | "COMPLIANCE_OVERDUE"
  | "CONSENT_BREACHED" | "SETTLEMENT_BREACHED"
  | "ENFORCEMENT_DELAYED" | "AWAITING_COURT" | "AWAITING_COUNSEL"
  | "HIGH_RISK" | "COMPLETED";

export interface NextLegalAction {
  code: string;
  label: string;
  reason: string;
  due_in_days: number | null;
  target_entity: "JUDGMENT" | "CONSENT" | "SETTLEMENT" | "ENFORCEMENT" | "FILING" | "COUNSEL" | "COST";
  target_id: string | null;
}
