// ============================================
// FOLLOW-UP ACTION TYPES (DB-backed: ce_follow_up_actions)
// ============================================

export enum ActionType {
  CALL = 'CALL',
  VISIT = 'VISIT',
  LETTER = 'LETTER',
  DOCUMENT_REQUEST = 'DOCUMENT_REQUEST',
  CHECK_REGISTRATION = 'CHECK_REGISTRATION',
  FOLLOW_UP_PAYMENT = 'FOLLOW_UP_PAYMENT',
  INSPECTION = 'INSPECTION',
  REVIEW = 'REVIEW',
  ESCALATION = 'ESCALATION',
  OTHER = 'OTHER'
}

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  [ActionType.CALL]: 'Call',
  [ActionType.VISIT]: 'Employer Visit',
  [ActionType.LETTER]: 'Letter/Notice',
  [ActionType.DOCUMENT_REQUEST]: 'Document Request',
  [ActionType.CHECK_REGISTRATION]: 'Check Registration',
  [ActionType.FOLLOW_UP_PAYMENT]: 'Follow-up Payment',
  [ActionType.INSPECTION]: 'Inspection',
  [ActionType.REVIEW]: 'Review',
  [ActionType.ESCALATION]: 'Escalation',
  [ActionType.OTHER]: 'Other'
};

export enum ActionPriority {
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum ActionStatus {
  PLANNED = 'PLANNED',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  OVERDUE = 'OVERDUE'
}

export enum ActionSource {
  MANUAL = 'MANUAL',
  AUTO_OPEN = 'AUTO_OPEN',
  AUTO_REVIEW = 'AUTO_REVIEW',
  NOTICE_DRIVEN = 'NOTICE_DRIVEN'
}

export interface FollowUpAction {
  id: string;
  violation_id: string;
  employer_id?: string | null;
  employer_name?: string | null;
  action_type: string;
  description: string;
  priority: string;
  status: string;
  assigned_to_user_id?: string | null;
  assigned_to_name?: string | null;
  assigned_queue_id?: string | null;
  due_date?: string | null;
  scheduled_date?: string | null;
  notes?: string | null;
  outcome?: string | null;
  source: string;
  completed_at?: string | null;
  completed_by?: string | null;
  created_by: string;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface FollowUpActionHistory {
  id: string;
  action_id: string;
  old_status?: string | null;
  new_status: string;
  changed_by: string;
  changed_by_name?: string | null;
  notes?: string | null;
  changed_at: string;
}

export interface CreateFollowUpActionRequest {
  violation_id: string;
  employer_id?: string;
  employer_name?: string;
  action_type: string;
  description: string;
  priority?: string;
  due_date?: string;
  scheduled_date?: string;
  notes?: string;
  assigned_to_user_id?: string;
  assigned_to_name?: string;
  assigned_queue_id?: string;
  source?: string;
  created_by: string;
}

export interface UpdateFollowUpActionRequest {
  status?: string;
  notes?: string;
  outcome?: string;
  scheduled_date?: string;
  due_date?: string;
  assigned_to_user_id?: string;
  assigned_to_name?: string;
  completed_at?: string;
  completed_by?: string;
  updated_by: string;
}

// Legacy compatibility aliases (deprecated)
export type ViolationAction = FollowUpAction;
