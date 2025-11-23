export enum ActionType {
  CALL = 'Call',
  EMPLOYER_VISIT = 'Employer Visit',
  LETTER_NOTICE = 'Letter/Notice',
  DOCUMENT_REQUEST = 'Document Request',
  CHECK_REGISTRATION = 'Check Registration Status',
  ESCALATE_LEGAL = 'Escalate to Legal',
  FOLLOW_UP_PAYMENT = 'Follow-up Payment',
  INSPECTION = 'Inspection',
  OTHER = 'Other'
}

export enum ActionPriority {
  NORMAL = 'Normal',
  HIGH = 'High',
  URGENT = 'Urgent'
}

export enum ActionStatus {
  PLANNED = 'Planned',
  IN_WEEKLY_PLAN = 'InWeeklyPlan',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled'
}

export interface ViolationAction {
  id: string;
  violationId: string;
  violationNumber?: string;
  employerId?: string;
  employerName?: string;
  territory?: 'St Kitts' | 'Nevis';
  assignedToUserId: string;
  assignedToName: string;
  actionType: ActionType;
  description: string;
  dueDate?: string;
  suggestedWeek?: string;
  priority: ActionPriority;
  status: ActionStatus;
  linkedWeeklyPlanItemId?: string;
  createdAt: string;
  createdByUserId: string;
  createdByName: string;
  completedAt?: string;
  completedByUserId?: string;
  completedByName?: string;
}

export interface CreateViolationActionRequest {
  violationId: string;
  assignedToUserId: string;
  actionType: ActionType;
  description: string;
  dueDate?: string;
  suggestedWeek?: string;
  priority: ActionPriority;
}

export interface UpdateViolationActionRequest {
  status?: ActionStatus;
  linkedWeeklyPlanItemId?: string;
  completedAt?: string;
  completedByUserId?: string;
}
