export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'DEPRECATED' | 'RETIRED';
export type WorkflowStepType =
  | 'START' | 'SUBMIT' | 'REVIEW' | 'APPROVAL' | 'VERIFICATION'
  | 'AUTHORIZATION' | 'PAYMENT_APPROVAL' | 'LEGAL_REVIEW' | 'COMPLIANCE_REVIEW'
  | 'SYSTEM' | 'END';
export type WorkflowActionType =
  | 'SUBMIT' | 'APPROVE' | 'REJECT' | 'RETURN' | 'REASSIGN'
  | 'DELEGATE' | 'WITHDRAW' | 'CANCEL' | 'COMPLETE' | 'ESCALATE' | 'SYSTEM';
export type WorkflowInstanceStatus =
  | 'DRAFT' | 'SUBMITTED' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'PENDING_APPROVAL'
  | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'WITHDRAWN' | 'CANCELLED'
  | 'COMPLETED' | 'ESCALATED';
export type WorkflowTaskStatus =
  | 'OPEN' | 'CLAIMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ESCALATED' | 'EXPIRED';
export type WorkflowPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type WorkflowOutcome = 'SUCCESS' | 'FAILURE' | 'DENIED' | 'ERROR';

export interface WorkflowDefinition {
  id: string;
  workflow_code: string;
  workflow_name: string;
  description: string | null;
  module_code: string;
  domain_code: string | null;
  entity_type: string;
  version: number;
  workflow_status: WorkflowStatus;
  start_step_code: string | null;
  requires_reason_on_reject: boolean;
  allow_withdrawal: boolean;
  allow_delegation: boolean;
  allow_reassignment: boolean;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: string;
  workflow_definition_id: string;
  step_code: string;
  step_name: string;
  description: string | null;
  step_type: WorkflowStepType;
  assigned_role_key: string | null;
  assigned_permission_key: string | null;
  assigned_user_id: string | null;
  assigned_office_code: string | null;
  assigned_department_id: string | null;
  is_start_step: boolean;
  is_end_step: boolean;
  sla_hours: number | null;
  allow_comments: boolean;
  allow_attachments: boolean;
  requires_reason: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTransition {
  id: string;
  workflow_definition_id: string;
  from_step_code: string;
  to_step_code: string | null;
  transition_code: string;
  transition_name: string;
  action_type: WorkflowActionType;
  required_permission_key: string | null;
  requires_reason: boolean;
  requires_comment: boolean;
  condition_expression: string | null;
  is_terminal: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowInstance {
  id: string;
  workflow_definition_id: string | null;
  workflow_code: string;
  workflow_version: number | null;
  module_code: string;
  entity_type: string;
  entity_id: string;
  entity_display_name: string | null;
  current_step_code: string | null;
  current_step_name: string | null;
  status: WorkflowInstanceStatus;
  submitted_by: string | null;
  submitted_at: string | null;
  completed_by: string | null;
  completed_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  due_at: string | null;
  priority: WorkflowPriority;
  owner_user_id: string | null;
  owner_role_key: string | null;
  owner_office_code: string | null;
  owner_department_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTask {
  id: string;
  workflow_instance_id: string;
  task_code: string | null;
  task_name: string;
  task_description: string | null;
  step_code: string;
  step_name: string | null;
  assigned_to_user_id: string | null;
  assigned_to_role_key: string | null;
  assigned_to_permission_key: string | null;
  assigned_to_office_code: string | null;
  assigned_to_department_id: string | null;
  task_status: WorkflowTaskStatus;
  priority: WorkflowPriority;
  due_at: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  completed_by: string | null;
  completed_at: string | null;
  outcome: string | null;
  comments: string | null;
  metadata: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowActionLog {
  id: string;
  workflow_instance_id: string;
  workflow_task_id: string | null;
  action_type: WorkflowActionType | 'CLAIM' | 'UNCLAIM';
  action_name: string | null;
  from_step_code: string | null;
  to_step_code: string | null;
  actor_user_id: string | null;
  actor_name: string | null;
  actor_role_summary: string | null;
  outcome: WorkflowOutcome;
  reason: string | null;
  comments: string | null;
  before_status: string | null;
  after_status: string | null;
  metadata: Record<string, unknown> | null;
  action_at: string;
}

export interface WorkflowDelegationRule {
  id: string;
  workflow_definition_id: string | null;
  module_code: string;
  step_code: string | null;
  role_key: string | null;
  permission_key: string | null;
  allow_delegation: boolean;
  require_approval: boolean;
  max_delegation_days: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowEscalationRule {
  id: string;
  workflow_definition_id: string;
  step_code: string;
  escalate_after_hours: number;
  escalate_to_role_key: string | null;
  escalate_to_user_id: string | null;
  escalate_to_permission_key: string | null;
  notification_template_code: string | null;
  escalation_priority: WorkflowPriority;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type WorkflowDefinitionFormValues = Partial<Omit<WorkflowDefinition, 'id' | 'created_at' | 'updated_at'>>;
export type WorkflowStepFormValues = Partial<Omit<WorkflowStep, 'id' | 'created_at' | 'updated_at'>>;
export type WorkflowTransitionFormValues = Partial<Omit<WorkflowTransition, 'id' | 'created_at' | 'updated_at'>>;

export interface WorkflowTaskActionFormValues {
  outcome?: string;
  comments?: string;
  reason?: string;
  assignee_user_id?: string;
  delegate_user_id?: string;
}

export interface WorkflowFilters {
  module_code?: string;
  entity_type?: string;
  workflow_status?: WorkflowStatus;
  is_active?: boolean;
  search?: string;
}

export interface WorkflowInboxFilters {
  scope?: 'mine' | 'team' | 'all';
  status?: WorkflowTaskStatus | 'ALL';
  priority?: WorkflowPriority | 'ALL';
  module_code?: string;
  search?: string;
}
