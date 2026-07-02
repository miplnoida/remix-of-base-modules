/**
 * EPIC-06D — Recovery Assignment & Operational Work Management
 * Type surface for lg_recovery_assignment domain.
 */

export type RecoveryAssignmentStatus =
  | "DRAFT" | "ASSIGNED" | "ACTIVE" | "SUSPENDED" | "ESCALATED" | "COMPLETED" | "CLOSED";

export type RecoveryAssignmentHealth = "HEALTHY" | "AT_RISK" | "CRITICAL";

export type RecoveryAssignmentPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type RecoveryStrategyCode =
  | "DEMAND" | "PHONE" | "VISIT" | "NEGOTIATION"
  | "INSTALLMENT" | "COURT_FU" | "ESCALATION";

export type RecoveryActionType =
  | "CALL" | "VISIT" | "LETTER" | "MEETING"
  | "NEGOTIATION" | "NOTE" | "OTHER";

export type TransferState = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CLOSED";

export interface RecoveryAssignment {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: RecoveryAssignmentStatus;
  health: RecoveryAssignmentHealth;
  priority: RecoveryAssignmentPriority;
  assigned_officer_id: string | null;
  assigned_officer_code: string | null;
  assigned_team_code: string | null;
  strategy_type_code: RecoveryStrategyCode | null;
  campaign_id: string | null;
  sla_policy_code: string | null;
  target_recovery_amount: number;
  target_date: string | null;
  next_action_code: string | null;
  next_action_at: string | null;
  next_action_due_at: string | null;
  last_action_at: string | null;
  escalation_reason: string | null;
  transfer_pending: boolean;
  liability_count: number;
  order_count: number;
  appeal_count: number;
  enforcement_count: number;
  total_principal: number;
  total_interest: number;
  total_penalty: number;
  total_assessed: number;
  total_paid: number;
  total_outstanding: number;
  recovery_pct: number;
  assigned_at: string | null;
  activated_at: string | null;
  completed_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface CreateRecoveryAssignmentInput {
  code?: string;
  title: string;
  description?: string;
  priority?: RecoveryAssignmentPriority;
  assigned_officer_id?: string | null;
  assigned_officer_code?: string | null;
  assigned_team_code?: string | null;
  strategy_type_code?: RecoveryStrategyCode | null;
  campaign_id?: string | null;
  sla_policy_code?: string | null;
  target_recovery_amount?: number;
  target_date?: string | null;
  liability_ids?: string[];
}

export interface RecoveryAssignmentAction {
  id: string;
  assignment_id: string;
  action_type: RecoveryActionType;
  action_at: string;
  subject: string | null;
  notes: string | null;
  outcome_code: string | null;
  contact_person: string | null;
  contact_channel: string | null;
  linked_task_id: string | null;
  linked_document_id: string | null;
  linked_hearing_id: string | null;
  amount_promised: number | null;
  promise_date: string | null;
  created_at: string;
  created_by: string | null;
}

export interface RecoveryAssignmentTransfer {
  id: string;
  assignment_id: string;
  from_officer_id: string | null;
  from_officer_code: string | null;
  to_officer_id: string | null;
  to_officer_code: string | null;
  to_team_code: string | null;
  reason: string;
  approval_state: TransferState;
  requested_by: string | null;
  requested_at: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_notes: string | null;
}

export interface RecoveryCampaign {
  id: string;
  code: string;
  name: string;
  campaign_type_code: string | null;
  description: string | null;
  from_date: string | null;
  to_date: string | null;
  target_amount: number;
  target_liability_count: number;
  owner_team_code: string | null;
  status: CampaignStatus;
  actual_recovered_amount: number;
  actual_assignment_count: number;
  created_at: string;
  updated_at: string;
}

export interface RecoveryStrategyType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  playbook_json: Array<{ step: number; action: string; sla_days?: number }>;
  default_sla_policy_code: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface RecoveryCampaignType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface RecoveryWorkloadRule {
  id: string;
  code: string;
  name: string;
  max_active_assignments: number;
  max_high_priority: number;
  warning_threshold_pct: number;
  critical_threshold_pct: number;
  escalation_rule_json: Record<string, unknown>;
  is_default: boolean;
  is_active: boolean;
}

export interface NextRecommendedAction {
  code: string;
  label: string;
  reason: string;
  due_in_days: number;
  strategy_code: RecoveryStrategyCode | null;
}
