// ============================================
// MOCK DATA FOR LEGAL CASE STAGES & STATUSES
// ============================================

export interface LegalStage {
  id: string;
  name: string;
  code: string;
  order: number;
  active: boolean;
  colour?: string;
}

export interface LegalStatus {
  id: string;
  name: string;
  code: string;
  stageId: string;
  orderInStage: number;
  active: boolean;
  description?: string;
  isStartStatus: boolean;
  isEndStatus: boolean;
  requiresDocument: boolean;
  documentTemplate?: string;
  triggersNotification: boolean;
  notificationTemplate?: string;
  triggersTask: boolean;
  taskTemplate?: string;
  allowedNextStatusIds: string[];
}

export const mockStages: LegalStage[] = [
  { id: 'stage-1', name: 'Pre-Legal Review', code: 'PRE_LEGAL', order: 1, active: true, colour: '#94a3b8' },
  { id: 'stage-2', name: 'Filing', code: 'FILING', order: 2, active: true, colour: '#60a5fa' },
  { id: 'stage-3', name: 'Court Proceedings', code: 'PROCEEDINGS', order: 3, active: true, colour: '#a78bfa' },
  { id: 'stage-4', name: 'Judgment', code: 'JUDGMENT', order: 4, active: true, colour: '#f59e0b' },
  { id: 'stage-5', name: 'Enforcement', code: 'ENFORCEMENT', order: 5, active: true, colour: '#ef4444' },
  { id: 'stage-6', name: 'Recovery', code: 'RECOVERY', order: 6, active: true, colour: '#10b981' },
  { id: 'stage-7', name: 'Closure', code: 'CLOSURE', order: 7, active: true, colour: '#6b7280' }
];

export const mockStatuses: LegalStatus[] = [
  // Pre-Legal Review
  { id: 'status-1', name: 'Pending Legal Review', code: 'PENDING_REVIEW', stageId: 'stage-1', orderInStage: 1, active: true, isStartStatus: true, isEndStatus: false, requiresDocument: false, triggersNotification: true, notificationTemplate: 'legal_review_initiated', triggersTask: true, taskTemplate: 'review_case_task', allowedNextStatusIds: ['status-2', 'status-3'] },
  { id: 'status-2', name: 'Awaiting Documents', code: 'AWAITING_DOCS', stageId: 'stage-1', orderInStage: 2, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: true, documentTemplate: 'missing_docs_checklist', triggersNotification: true, notificationTemplate: 'docs_required', triggersTask: false, allowedNextStatusIds: ['status-3', 'status-4'] },
  { id: 'status-3', name: 'Approved for Legal Action', code: 'APPROVED_ACTION', stageId: 'stage-1', orderInStage: 3, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: false, triggersNotification: true, notificationTemplate: 'approved_for_action', triggersTask: true, taskTemplate: 'prepare_filing', allowedNextStatusIds: ['status-4', 'status-5'] },
  { id: 'status-4', name: 'Legal Action Requisition Created', code: 'REQUISITION_CREATED', stageId: 'stage-1', orderInStage: 4, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: true, documentTemplate: 'legal_requisition', triggersNotification: false, triggersTask: false, allowedNextStatusIds: ['status-5'] },
  { id: 'status-5', name: 'Ready to File', code: 'READY_TO_FILE', stageId: 'stage-1', orderInStage: 5, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: false, triggersNotification: true, notificationTemplate: 'ready_for_filing', triggersTask: false, allowedNextStatusIds: ['status-6'] },
  
  // Filing
  { id: 'status-6', name: 'Filed in Court', code: 'FILED', stageId: 'stage-2', orderInStage: 1, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: true, documentTemplate: 'court_filing', triggersNotification: true, notificationTemplate: 'case_filed', triggersTask: true, taskTemplate: 'track_service', allowedNextStatusIds: ['status-7'] },
  { id: 'status-7', name: 'Awaiting Service', code: 'AWAITING_SERVICE', stageId: 'stage-2', orderInStage: 2, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: false, triggersNotification: false, triggersTask: false, allowedNextStatusIds: ['status-8', 'status-9'] },
  { id: 'status-8', name: 'Service Completed', code: 'SERVICE_COMPLETED', stageId: 'stage-2', orderInStage: 3, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: true, documentTemplate: 'affidavit_of_service', triggersNotification: true, notificationTemplate: 'service_confirmed', triggersTask: false, allowedNextStatusIds: ['status-10'] },
  { id: 'status-9', name: 'Service Failed', code: 'SERVICE_FAILED', stageId: 'stage-2', orderInStage: 4, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: false, triggersNotification: true, notificationTemplate: 'service_failure', triggersTask: true, taskTemplate: 'retry_service', allowedNextStatusIds: ['status-7', 'status-8'] },
  
  // Court Proceedings
  { id: 'status-10', name: 'Awaiting First Hearing', code: 'AWAITING_HEARING', stageId: 'stage-3', orderInStage: 1, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: false, triggersNotification: true, notificationTemplate: 'hearing_scheduled', triggersTask: false, allowedNextStatusIds: ['status-11', 'status-12', 'status-13'] },
  { id: 'status-11', name: 'Adjourned (On Request)', code: 'ADJOURNED_REQUEST', stageId: 'stage-3', orderInStage: 2, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: false, triggersNotification: true, notificationTemplate: 'case_adjourned', triggersTask: false, allowedNextStatusIds: ['status-10', 'status-14'] },
  { id: 'status-12', name: 'Adjourned (By Court)', code: 'ADJOURNED_COURT', stageId: 'stage-3', orderInStage: 3, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: false, triggersNotification: true, notificationTemplate: 'case_adjourned', triggersTask: false, allowedNextStatusIds: ['status-10', 'status-14'] },
  { id: 'status-13', name: 'Part-Heard', code: 'PART_HEARD', stageId: 'stage-3', orderInStage: 4, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: false, triggersNotification: false, triggersTask: false, allowedNextStatusIds: ['status-14'] },
  { id: 'status-14', name: 'Awaiting Judgment', code: 'AWAITING_JUDGMENT', stageId: 'stage-3', orderInStage: 5, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: false, triggersNotification: true, notificationTemplate: 'judgment_pending', triggersTask: false, allowedNextStatusIds: ['status-15', 'status-16', 'status-17', 'status-18', 'status-19'] },
  
  // Judgment
  { id: 'status-15', name: 'Judgment Granted', code: 'JUDGMENT_GRANTED', stageId: 'stage-4', orderInStage: 1, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: true, documentTemplate: 'court_judgment', triggersNotification: true, notificationTemplate: 'judgment_granted', triggersTask: true, taskTemplate: 'prepare_enforcement', allowedNextStatusIds: ['status-20'] },
  { id: 'status-16', name: 'Judgment Dismissed', code: 'JUDGMENT_DISMISSED', stageId: 'stage-4', orderInStage: 2, active: true, isStartStatus: false, isEndStatus: true, requiresDocument: true, documentTemplate: 'dismissal_order', triggersNotification: true, notificationTemplate: 'case_dismissed', triggersTask: false, allowedNextStatusIds: ['status-26'] },
  { id: 'status-17', name: 'Case Withdrawn', code: 'WITHDRAWN', stageId: 'stage-4', orderInStage: 3, active: true, isStartStatus: false, isEndStatus: true, requiresDocument: false, triggersNotification: true, notificationTemplate: 'case_withdrawn', triggersTask: false, allowedNextStatusIds: ['status-28'] },
  { id: 'status-18', name: 'Settled Before Judgment', code: 'SETTLED_BEFORE', stageId: 'stage-4', orderInStage: 4, active: true, isStartStatus: false, isEndStatus: true, requiresDocument: true, documentTemplate: 'settlement_agreement', triggersNotification: true, notificationTemplate: 'settlement_reached', triggersTask: false, allowedNextStatusIds: ['status-26'] },
  { id: 'status-19', name: 'Settled After Judgment', code: 'SETTLED_AFTER', stageId: 'stage-4', orderInStage: 5, active: true, isStartStatus: false, isEndStatus: true, requiresDocument: true, documentTemplate: 'settlement_agreement', triggersNotification: true, notificationTemplate: 'settlement_reached', triggersTask: false, allowedNextStatusIds: ['status-26'] },
  
  // Enforcement
  { id: 'status-20', name: 'Enforcement Pending', code: 'ENFORCEMENT_PENDING', stageId: 'stage-5', orderInStage: 1, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: false, triggersNotification: false, triggersTask: false, allowedNextStatusIds: ['status-21', 'status-24', 'status-25'] },
  { id: 'status-21', name: 'Writ of Execution Filed', code: 'WRIT_FILED', stageId: 'stage-5', orderInStage: 2, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: true, documentTemplate: 'writ_of_execution', triggersNotification: true, notificationTemplate: 'writ_filed', triggersTask: false, allowedNextStatusIds: ['status-22', 'status-26'] },
  { id: 'status-22', name: 'Bailiff Action In Progress', code: 'BAILIFF_ACTION', stageId: 'stage-5', orderInStage: 3, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: false, triggersNotification: false, triggersTask: false, allowedNextStatusIds: ['status-23', 'status-26'] },
  { id: 'status-23', name: 'Enforcement Application Rejected', code: 'ENFORCEMENT_REJECTED', stageId: 'stage-5', orderInStage: 4, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: false, triggersNotification: true, notificationTemplate: 'enforcement_rejected', triggersTask: true, taskTemplate: 'review_enforcement', allowedNextStatusIds: ['status-20', 'status-28'] },
  { id: 'status-24', name: 'Payment Order Granted', code: 'PAYMENT_ORDER', stageId: 'stage-5', orderInStage: 5, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: true, documentTemplate: 'payment_order', triggersNotification: true, notificationTemplate: 'payment_order_issued', triggersTask: false, allowedNextStatusIds: ['status-23'] },
  { id: 'status-25', name: 'Garnishment Order Granted', code: 'GARNISHMENT_ORDER', stageId: 'stage-5', orderInStage: 6, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: true, documentTemplate: 'garnishment_order', triggersNotification: true, notificationTemplate: 'garnishment_issued', triggersTask: false, allowedNextStatusIds: ['status-23'] },
  { id: 'status-26', name: 'Writ Returned Unsatisfied', code: 'WRIT_UNSATISFIED', stageId: 'stage-5', orderInStage: 7, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: false, triggersNotification: true, notificationTemplate: 'writ_unsatisfied', triggersTask: true, taskTemplate: 'review_recovery_options', allowedNextStatusIds: ['status-28'] },
  
  // Recovery
  { id: 'status-23', name: 'Recoveries In Progress', code: 'RECOVERY_IN_PROGRESS', stageId: 'stage-6', orderInStage: 1, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: false, triggersNotification: false, triggersTask: false, allowedNextStatusIds: ['status-24', 'status-25'] },
  { id: 'status-24', name: 'Partial Recovery Completed', code: 'PARTIAL_RECOVERY', stageId: 'stage-6', orderInStage: 2, active: true, isStartStatus: false, isEndStatus: false, requiresDocument: false, triggersNotification: true, notificationTemplate: 'partial_recovery', triggersTask: false, allowedNextStatusIds: ['status-23', 'status-25', 'status-27'] },
  { id: 'status-25', name: 'Full Recovery Completed', code: 'FULL_RECOVERY', stageId: 'stage-6', orderInStage: 3, active: true, isStartStatus: false, isEndStatus: true, requiresDocument: false, triggersNotification: true, notificationTemplate: 'full_recovery', triggersTask: false, allowedNextStatusIds: ['status-26'] },
  
  // Closure
  { id: 'status-26', name: 'Case Closed – Fully Satisfied', code: 'CLOSED_SATISFIED', stageId: 'stage-7', orderInStage: 1, active: true, isStartStatus: false, isEndStatus: true, requiresDocument: false, triggersNotification: true, notificationTemplate: 'case_closed', triggersTask: false, allowedNextStatusIds: [] },
  { id: 'status-27', name: 'Case Closed – Unsatisfied', code: 'CLOSED_UNSATISFIED', stageId: 'stage-7', orderInStage: 2, active: true, isStartStatus: false, isEndStatus: true, requiresDocument: false, triggersNotification: true, notificationTemplate: 'case_closed', triggersTask: false, allowedNextStatusIds: [] },
  { id: 'status-28', name: 'Administrative Closure', code: 'ADMIN_CLOSURE', stageId: 'stage-7', orderInStage: 3, active: true, isStartStatus: false, isEndStatus: true, requiresDocument: true, documentTemplate: 'closure_memo', triggersNotification: true, notificationTemplate: 'case_closed', triggersTask: false, allowedNextStatusIds: [] }
];

export const mockDocumentTemplates = [
  'missing_docs_checklist',
  'legal_requisition',
  'court_filing',
  'affidavit_of_service',
  'court_judgment',
  'dismissal_order',
  'settlement_agreement',
  'writ_of_execution',
  'payment_order',
  'garnishment_order',
  'closure_memo'
];

export const mockNotificationTemplates = [
  'legal_review_initiated',
  'docs_required',
  'approved_for_action',
  'ready_for_filing',
  'case_filed',
  'service_confirmed',
  'service_failure',
  'hearing_scheduled',
  'case_adjourned',
  'judgment_pending',
  'judgment_granted',
  'case_dismissed',
  'case_withdrawn',
  'settlement_reached',
  'writ_filed',
  'enforcement_rejected',
  'payment_order_issued',
  'garnishment_issued',
  'writ_unsatisfied',
  'partial_recovery',
  'full_recovery',
  'case_closed'
];

export const mockTaskTemplates = [
  'review_case_task',
  'prepare_filing',
  'track_service',
  'retry_service',
  'prepare_enforcement',
  'review_enforcement',
  'review_recovery_options'
];
