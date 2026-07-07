export const MIGRATION_EVENTS = {
  plan: {
    created: 'MIGRATION_PLAN_CREATED',
    updated: 'MIGRATION_PLAN_UPDATED',
    submitted: 'MIGRATION_PLAN_SUBMITTED',
    approved: 'MIGRATION_PLAN_APPROVED',
    rejected: 'MIGRATION_PLAN_REJECTED',
  },
  planTable: {
    added: 'MIGRATION_PLAN_TABLE_ADDED',
    updated: 'MIGRATION_PLAN_TABLE_UPDATED',
    removed: 'MIGRATION_PLAN_TABLE_REMOVED',
  },
  batch: {
    created: 'MIGRATION_BATCH_CREATED',
    updated: 'MIGRATION_BATCH_UPDATED',
    submitted: 'MIGRATION_BATCH_SUBMITTED',
    approved: 'MIGRATION_BATCH_APPROVED',
    started: 'MIGRATION_BATCH_STARTED',
    completed: 'MIGRATION_BATCH_COMPLETED',
    failed: 'MIGRATION_BATCH_FAILED',
    rolledBack: 'MIGRATION_BATCH_ROLLED_BACK',
  },
  run: {
    started: 'MIGRATION_RUN_STARTED',
    completed: 'MIGRATION_RUN_COMPLETED',
    failed: 'MIGRATION_RUN_FAILED',
  },
  tableRun: {
    started: 'MIGRATION_TABLE_RUN_STARTED',
    completed: 'MIGRATION_TABLE_RUN_COMPLETED',
    failed: 'MIGRATION_TABLE_RUN_FAILED',
  },
  validation: {
    ruleCreated: 'MIGRATION_VALIDATION_RULE_CREATED',
    ruleUpdated: 'MIGRATION_VALIDATION_RULE_UPDATED',
    resultRecorded: 'MIGRATION_VALIDATION_RESULT_RECORDED',
  },
  reconciliation: {
    recorded: 'MIGRATION_RECONCILIATION_RECORDED',
    acceptedWithDifference: 'MIGRATION_RECONCILIATION_ACCEPTED_WITH_DIFFERENCE',
  },
  issue: {
    created: 'MIGRATION_ISSUE_CREATED',
    updated: 'MIGRATION_ISSUE_UPDATED',
    resolved: 'MIGRATION_ISSUE_RESOLVED',
    waived: 'MIGRATION_ISSUE_WAIVED',
  },
  cutover: {
    checkCreated: 'MIGRATION_CUTOVER_CHECK_CREATED',
    resultUpdated: 'MIGRATION_CUTOVER_RESULT_UPDATED',
    approved: 'MIGRATION_CUTOVER_APPROVED',
  },
  powerbuilderObject: {
    discovered: 'POWERBUILDER_OBJECT_DISCOVERED',
    updated: 'POWERBUILDER_OBJECT_UPDATED',
    reviewed: 'POWERBUILDER_OBJECT_REVIEWED',
  },
  export: {
    created: 'MIGRATION_EXPORT_CREATED',
  },
} as const;
