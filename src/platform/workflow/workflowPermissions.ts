export const WORKFLOW_PERMISSIONS = {
  admin: {
    view: 'core.admin.workflow.view',
    manageDefinitions: 'core.admin.workflow.manage_definitions',
    manageSteps: 'core.admin.workflow.manage_steps',
    manageTransitions: 'core.admin.workflow.manage_transitions',
    manageRules: 'core.admin.workflow.manage_rules',
    activate: 'core.admin.workflow.activate',
    retire: 'core.admin.workflow.retire',
  },
  inbox: {
    view: 'core.workflow.inbox.view',
  },
  task: {
    claim: 'core.workflow.task.claim',
    complete: 'core.workflow.task.complete',
    approve: 'core.workflow.task.approve',
    reject: 'core.workflow.task.reject',
    return: 'core.workflow.task.return',
    reassign: 'core.workflow.task.reassign',
    delegate: 'core.workflow.task.delegate',
    escalate: 'core.workflow.task.escalate',
    withdraw: 'core.workflow.task.withdraw',
    cancel: 'core.workflow.task.cancel',
  },
  audit: {
    view: 'core.workflow.audit.view',
  },
} as const;

export type WorkflowPermissionKey =
  | typeof WORKFLOW_PERMISSIONS.admin[keyof typeof WORKFLOW_PERMISSIONS.admin]
  | typeof WORKFLOW_PERMISSIONS.inbox[keyof typeof WORKFLOW_PERMISSIONS.inbox]
  | typeof WORKFLOW_PERMISSIONS.task[keyof typeof WORKFLOW_PERMISSIONS.task]
  | typeof WORKFLOW_PERMISSIONS.audit[keyof typeof WORKFLOW_PERMISSIONS.audit];
