export const WORKFLOW_EVENTS = {
  definition: {
    created: 'WORKFLOW_DEFINITION_CREATED',
    updated: 'WORKFLOW_DEFINITION_UPDATED',
    activated: 'WORKFLOW_DEFINITION_ACTIVATED',
    retired: 'WORKFLOW_DEFINITION_RETIRED',
  },
  step: {
    created: 'WORKFLOW_STEP_CREATED',
    updated: 'WORKFLOW_STEP_UPDATED',
  },
  transition: {
    created: 'WORKFLOW_TRANSITION_CREATED',
    updated: 'WORKFLOW_TRANSITION_UPDATED',
  },
  instance: {
    started: 'WORKFLOW_INSTANCE_STARTED',
    submitted: 'WORKFLOW_INSTANCE_SUBMITTED',
    approved: 'WORKFLOW_INSTANCE_APPROVED',
    rejected: 'WORKFLOW_INSTANCE_REJECTED',
    returned: 'WORKFLOW_INSTANCE_RETURNED',
    withdrawn: 'WORKFLOW_INSTANCE_WITHDRAWN',
    cancelled: 'WORKFLOW_INSTANCE_CANCELLED',
    completed: 'WORKFLOW_INSTANCE_COMPLETED',
    escalated: 'WORKFLOW_INSTANCE_ESCALATED',
  },
  task: {
    created: 'WORKFLOW_TASK_CREATED',
    claimed: 'WORKFLOW_TASK_CLAIMED',
    completed: 'WORKFLOW_TASK_COMPLETED',
    reassigned: 'WORKFLOW_TASK_REASSIGNED',
    delegated: 'WORKFLOW_TASK_DELEGATED',
    escalated: 'WORKFLOW_TASK_ESCALATED',
  },
} as const;
