// ── Escalation Engine Constants ──
// Shared catalogs for the policy-driven Escalation Rule model.

export interface EscalationFamilyDef {
  value: string;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export const ESCALATION_FAMILIES: EscalationFamilyDef[] = [
  { value: 'violation_to_case', label: 'Violation → Case', description: 'When violations should be consolidated into a formal enforcement case', icon: 'ArrowUpRight', color: 'text-blue-600' },
  { value: 'case_progression', label: 'Case Progression', description: 'Governs movement through the case lifecycle stages', icon: 'ArrowRight', color: 'text-amber-600' },
  { value: 'legal_escalation', label: 'Legal Escalation', description: 'Transition from enforcement to legal proceedings', icon: 'Scale', color: 'text-red-600' },
  { value: 'arrangement_breach', label: 'Arrangement Breach', description: 'Handles defaulted payment arrangements', icon: 'AlertTriangle', color: 'text-orange-600' },
  { value: 'manager_review', label: 'Manager Review', description: 'Routes to supervisory review based on thresholds or staleness', icon: 'UserCheck', color: 'text-purple-600' },
];

export interface StateMachineState {
  value: string;
  label: string;
  stage: 'violation' | 'case' | 'legal' | 'resolution';
  description: string;
  allowedNextStates: string[];
  noticePrerequisite: boolean;
  approvalRequired: boolean;
}

export const STATE_MACHINE: StateMachineState[] = [
  // Violation Stage
  { value: 'OPEN', label: 'Open', stage: 'violation', description: 'Initial violation created', allowedNextStates: ['UNDER_REVIEW', 'CASE_OPEN', 'PRIORITY_QUEUE'], noticePrerequisite: false, approvalRequired: false },
  { value: 'UNDER_REVIEW', label: 'Under Review', stage: 'violation', description: 'Violation being assessed by officer', allowedNextStates: ['WARNING_NOTICE', 'CASE_OPEN', 'PRIORITY_QUEUE', 'MANAGER_REVIEW', 'RESOLVED'], noticePrerequisite: false, approvalRequired: false },
  // Case Stage
  { value: 'CASE_OPEN', label: 'Case Open', stage: 'case', description: 'Formal case created from violation(s)', allowedNextStates: ['WARNING_NOTICE', 'MANAGER_REVIEW', 'ARRANGEMENT'], noticePrerequisite: false, approvalRequired: false },
  { value: 'WARNING_NOTICE', label: 'Warning Notice', stage: 'case', description: '1st notice sent to employer', allowedNextStates: ['DEMAND_NOTICE', 'ARRANGEMENT', 'MANAGER_REVIEW'], noticePrerequisite: true, approvalRequired: false },
  { value: 'DEMAND_NOTICE', label: 'Demand Notice', stage: 'case', description: '2nd notice — formal demand issued', allowedNextStates: ['FINAL_DEMAND', 'ARRANGEMENT', 'MANAGER_REVIEW'], noticePrerequisite: true, approvalRequired: false },
  { value: 'FINAL_DEMAND', label: 'Final Demand', stage: 'case', description: 'Final warning before legal action', allowedNextStates: ['LEGAL_ACTION_REQUISITION', 'ARRANGEMENT', 'MANAGER_REVIEW'], noticePrerequisite: true, approvalRequired: false },
  { value: 'WARNING_ISSUED', label: 'Warning Issued', stage: 'case', description: 'Generic warning state', allowedNextStates: ['ESCALATED', 'SUMMONS_ISSUED', 'ARRANGEMENT'], noticePrerequisite: true, approvalRequired: false },
  { value: 'ESCALATED', label: 'Escalated', stage: 'case', description: 'Case escalated for senior attention', allowedNextStates: ['MANAGER_REVIEW', 'WARNING_NOTICE', 'LEGAL_ACTION_REQUISITION'], noticePrerequisite: false, approvalRequired: false },
  { value: 'PRIORITY_QUEUE', label: 'Priority Queue', stage: 'case', description: 'High-priority routing', allowedNextStates: ['UNDER_REVIEW', 'WARNING_NOTICE', 'CASE_OPEN', 'MANAGER_REVIEW', 'LEGAL_ACTION_REQUISITION'], noticePrerequisite: false, approvalRequired: false },
  { value: 'MANAGER_REVIEW', label: 'Manager Review', stage: 'case', description: 'Supervisory review required', allowedNextStates: ['CASE_OPEN', 'WARNING_NOTICE', 'LEGAL_ACTION_REQUISITION', 'RESOLVED', 'CLOSED'], noticePrerequisite: false, approvalRequired: true },
  { value: 'ARRANGEMENT', label: 'Arrangement Active', stage: 'case', description: 'Payment arrangement in place', allowedNextStates: ['DEMAND_NOTICE', 'LEGAL_ACTION_REQUISITION', 'RESOLVED'], noticePrerequisite: false, approvalRequired: false },
  { value: 'SUMMONS_ISSUED', label: 'Summons Issued', stage: 'case', description: 'Court summons served', allowedNextStates: ['LEGAL_ACTION'], noticePrerequisite: true, approvalRequired: true },
  // Legal Stage
  { value: 'LEGAL_ACTION_REQUISITION', label: 'Legal Action Requisition', stage: 'legal', description: 'Legal referral recommended', allowedNextStates: ['LEGAL_ACTION', 'MANAGER_REVIEW'], noticePrerequisite: false, approvalRequired: true },
  { value: 'LEGAL_ACTION', label: 'Legal Action', stage: 'legal', description: 'Active legal proceedings', allowedNextStates: ['RESOLVED', 'CLOSED'], noticePrerequisite: false, approvalRequired: true },
  // Resolution
  { value: 'RESOLVED', label: 'Resolved', stage: 'resolution', description: 'Matter resolved — debt paid or settled', allowedNextStates: ['CLOSED'], noticePrerequisite: false, approvalRequired: false },
  { value: 'CLOSED', label: 'Closed', stage: 'resolution', description: 'Case permanently closed', allowedNextStates: [], noticePrerequisite: false, approvalRequired: false },
];

export type ExecutionMode = 'AUTO' | 'RECOMMEND' | 'MANUAL';

export const EXECUTION_MODES: { value: ExecutionMode; label: string; description: string }[] = [
  { value: 'AUTO', label: 'Automatic', description: 'System executes transition immediately when conditions are met' },
  { value: 'RECOMMEND', label: 'Recommend', description: 'System recommends but requires human approval' },
  { value: 'MANUAL', label: 'Manual Only', description: 'Only triggered by manual user action' },
];

export interface PrerequisiteDef {
  value: string;
  label: string;
  description: string;
}

export const PREREQUISITES: PrerequisiteDef[] = [
  { value: 'notice_sent', label: 'Notice Sent', description: 'At least one notice has been delivered to the employer' },
  { value: 'proof_of_service', label: 'Proof of Service', description: 'Delivery confirmation or proof of service exists' },
  { value: 'waiting_period_elapsed', label: 'Waiting Period Elapsed', description: 'Minimum days have passed since last notice' },
  { value: 'supervisor_approval', label: 'Supervisor Approval', description: 'A supervisor has approved the escalation' },
  { value: 'no_active_arrangement', label: 'No Active Arrangement', description: 'Employer has no current payment arrangement' },
  { value: 'no_open_dispute', label: 'No Open Dispute', description: 'Employer has no active dispute or appeal pending' },
  { value: 'investigation_complete', label: 'Investigation Complete', description: 'Field investigation or audit has been completed' },
  { value: 'no_response', label: 'No Employer Response', description: 'Employer has not responded within the prescribed period' },
  { value: 'payment_not_received', label: 'Payment Not Received', description: 'No payment has been received since last action' },
  { value: 'arrangement_defaulted', label: 'Arrangement Defaulted', description: 'Payment arrangement has been breached/defaulted' },
];

export interface DerivedMetricDef {
  value: string;
  label: string;
  group: string;
  description: string;
  computation: string;
}

export const DERIVED_METRICS: DerivedMetricDef[] = [
  { value: 'total_exposure', label: 'Total Exposure ($)', group: 'Financial', description: 'Sum of all outstanding amounts including penalties and interest', computation: 'SUM(principal + penalties + interest)' },
  { value: 'days_overdue', label: 'Days Overdue', group: 'Time', description: 'Days since the contribution due date', computation: 'now() - due_date' },
  { value: 'case_age_days', label: 'Case Age (Days)', group: 'Time', description: 'Days since the case was opened', computation: 'now() - case.created_at' },
  { value: 'notice_wait_days', label: 'Days Since Last Notice', group: 'Time', description: 'Days since the most recent notice was sent', computation: 'now() - last_notice_date' },
  { value: 'additional_months', label: 'Additional Months', group: 'Time', description: 'Months overdue beyond the first month', computation: 'MAX(0, months_overdue - 1)' },
  { value: 'periods_missing', label: 'Periods Missing', group: 'Compliance', description: 'Count of C3 periods with no filing', computation: 'COUNT(missing_periods)' },
  { value: 'active_violation_count', label: 'Active Violations', group: 'Compliance', description: 'Number of open violations for the employer', computation: 'COUNT(violations WHERE status IN open,review)' },
  { value: 'repeat_offender_score', label: 'Repeat Offender Score', group: 'Risk', description: 'Measure of recidivism based on historical violations', computation: 'COUNT(closed_violations_12m) × weight' },
  { value: 'arrangement_missed_count', label: 'Missed Installments', group: 'Compliance', description: 'Number of missed arrangement installments', computation: 'COUNT(overdue_installments)' },
  { value: 'is_defaulted', label: 'Is Defaulted', group: 'Status', description: 'Whether the payment arrangement has defaulted', computation: 'missed_count >= breach_threshold' },
  { value: 'risk_score', label: 'Risk Score', group: 'Risk', description: 'Overall employer risk score from risk profile', computation: 'ce_risk_profiles.overall_score' },
];

// Get allowed "to" states based on a given "from" state
export function getAllowedTransitions(fromStatus: string): StateMachineState[] {
  const state = STATE_MACHINE.find(s => s.value === fromStatus);
  if (!state) return STATE_MACHINE;
  return STATE_MACHINE.filter(s => state.allowedNextStates.includes(s.value));
}

// Get the stage color for badges
export function getStageColor(stage: string): string {
  switch (stage) {
    case 'violation': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'case': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    case 'legal': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    case 'resolution': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    default: return 'bg-muted text-muted-foreground';
  }
}
