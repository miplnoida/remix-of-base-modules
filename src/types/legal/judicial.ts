/**
 * EPIC-06B — shared types for Judicial Orders, Appeals & Enforcement.
 */

import type { LgOrderStatus, LgOrderComplianceStatus } from "@/services/legal/lgOrderStateMachine";
import type { LgAppealStatus } from "@/services/legal/lgAppealStateMachine";
import type { LgEnforcementStatus } from "@/services/legal/lgEnforcementStateMachine";

export interface LgOrderRecord {
  id: string;
  lg_case_id: string;
  order_no: string;
  order_type_code: string;
  hearing_id?: string | null;
  issued_by_court?: string | null;
  court_file_no?: string | null;
  judge_name?: string | null;
  issued_date?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  compliance_date?: string | null;
  appeal_deadline?: string | null;
  ordered_amount?: number | null;
  costs_awarded?: number | null;
  interest_awarded?: number | null;
  penalty_awarded?: number | null;
  status: LgOrderStatus;
  compliance_status?: LgOrderComplianceStatus | null;
  appeal_status?: string | null;
  enforcement_status?: string | null;
  enforcement_required?: boolean | null;
  enforcement_ref?: string | null;
  payment_arrangement_id?: string | null;
  terms?: string | null;
  filed_date?: string | null;
  granted_date?: string | null;
  complied_date?: string | null;
  breached_date?: string | null;
  closed_date?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface LgAppealRecord {
  id: string;
  appeal_no?: string | null;
  case_id: string;
  order_id?: string | null;
  filing_party?: string | null;
  grounds?: string | null;
  filing_date?: string | null;
  appeal_deadline?: string | null;
  hearing_date?: string | null;
  decision_date?: string | null;
  outcome?: string | null;
  status: LgAppealStatus;
  recovery_impact_amount?: number | null;
  remarks?: string | null;
  document_ref_id?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface LgEnforcementRecord {
  id: string;
  enforcement_no?: string | null;
  case_id: string;
  order_id?: string | null;
  enforcement_type: string;
  status: LgEnforcementStatus;
  requested_date?: string | null;
  approved_date?: string | null;
  execution_date?: string | null;
  officer_code?: string | null;
  external_agency?: string | null;
  amount_targeted?: number | null;
  amount_recovered?: number | null;
  outcome?: string | null;
  next_action?: string | null;
  remarks?: string | null;
  document_ref_id?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface LgOrderComplianceEventRecord {
  id: string;
  order_id: string;
  case_id: string;
  liability_id?: string | null;
  event_type: string;
  event_date: string;
  amount?: number | null;
  remarks?: string | null;
  created_by?: string | null;
  created_at: string;
}

export const LG_ORDER_TYPES = [
  { code: "PAYMENT_ORDER",    label: "Payment Order" },
  { code: "JUDGMENT",         label: "Judgment" },
  { code: "CONSENT_ORDER",    label: "Consent Order" },
  { code: "COMPLIANCE_ORDER", label: "Compliance Order" },
  { code: "GARNISHMENT",      label: "Garnishment Order" },
  { code: "ENFORCEMENT",      label: "Enforcement Order" },
  { code: "INTERIM",          label: "Interim Order" },
  { code: "FINAL",            label: "Final Order" },
  { code: "COST",             label: "Cost Order" },
  { code: "WITHDRAWAL",       label: "Withdrawal / Dismissal Order" },
  { code: "OTHER",            label: "Other" },
] as const;

export const LG_COMPLIANCE_EVENT_TYPES = [
  { code: "PAYMENT_RECEIVED",       label: "Payment Received" },
  { code: "PARTIAL_PAYMENT",        label: "Partial Payment Received" },
  { code: "DOCUMENT_SUBMITTED",     label: "Document Submitted" },
  { code: "EMPLOYER_COMPLIED",      label: "Employer Complied" },
  { code: "IP_COMPLIED",            label: "IP Complied" },
  { code: "MISSED_DEADLINE",        label: "Missed Deadline" },
  { code: "BREACH_RECORDED",        label: "Breach Recorded" },
  { code: "EXTENSION_GRANTED",      label: "Extension Granted" },
  { code: "FURTHER_ORDER_REQUIRED", label: "Further Order Required" },
] as const;
