/**
 * Types for the Employer Compliance History "full posture" bundle.
 * Read-only aggregator output used by EmployerComplianceHistoryPanel,
 * the Audit Report renderer, and the Comms snippet builder.
 */

export type PriorMatterType =
  | 'CASE'
  | 'VIOLATION'
  | 'ARRANGEMENT'
  | 'LEGAL'
  | 'FOLLOW_UP'
  | 'PAST_INSPECTION'
  | 'PAST_REPORT'
  | 'DISPUTE';

export interface PostureCase {
  id: string;
  case_number: string | null;
  case_type: string | null;
  status: string | null;
  priority: string | null;
  created_at: string;
  resolved_at: string | null;
  is_locked: boolean | null;
}

export interface PostureViolation {
  id: string;
  violation_number: string | null;
  violation_type_code: string | null;
  violation_type_name: string | null;
  status: string | null;
  severity: string | null;
  total_amount: number | null;
  created_at: string;
  summary: string | null;
}

export interface PostureArrangement {
  id: string;
  arrangement_number: string | null;
  status: string | null;
  total_debt: number | null;
  total_paid: number | null;
  start_date: string | null;
  end_date: string | null;
  next_due_date: string | null;
  missed_payments: number | null;
}

export interface PostureLegal {
  id: string;
  reference_number: string | null;
  proceeding_type: string | null;
  status: string | null;
  filed_date: string | null;
  next_hearing_date: string | null;
}

export interface PostureFollowUp {
  id: string;
  action_number: string | null;
  action_type: string | null;
  status: string | null;
  due_date: string | null;
  description: string | null;
}

export interface PostureInspection {
  id: string;
  inspection_number: string | null;
  status: string | null;
  visit_date: string | null;
  inspector_name: string | null;
  findings_count: number;
}

export interface PostureReport {
  id: string;
  report_number: string | null;
  report_type: string | null;
  status: string | null;
  generated_at: string | null;
}

export interface PostureDispute {
  id: string;
  dispute_number: string | null;
  status: string | null;
  raised_at: string | null;
  reason: string | null;
}

export interface PostureLedgerSnapshot {
  total_outstanding: number;
  oldest_overdue_date: string | null;
  overdue_periods: number;
}

export interface EmployerCompliancePosture {
  employer_id: string;
  fetched_at: string;
  cases: PostureCase[];
  violations: PostureViolation[];
  arrangements: PostureArrangement[];
  legal: PostureLegal[];
  followUps: PostureFollowUp[];
  pastInspections: PostureInspection[];
  pastReports: PostureReport[];
  disputes: PostureDispute[];
  ledger: PostureLedgerSnapshot;
}

export interface PriorMatterLink {
  id: string;
  inspection_id: string | null;
  finding_id: string | null;
  employer_id: string;
  matter_type: PriorMatterType;
  matter_id: string;
  matter_label: string | null;
  relevance_note: string | null;
  linked_by: string | null;
  linked_at: string;
  is_active: boolean;
}
