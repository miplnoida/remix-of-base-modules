export const MIGRATION_PERMISSIONS = {
  view: 'core.admin.migration.view',
  managePlans: 'core.admin.migration.manage_plans',
  manageBatches: 'core.admin.migration.manage_batches',
  manageRuns: 'core.admin.migration.manage_runs',
  manageValidationRules: 'core.admin.migration.manage_validation_rules',
  manageReconciliation: 'core.admin.migration.manage_reconciliation',
  manageIssues: 'core.admin.migration.manage_issues',
  manageCutover: 'core.admin.migration.manage_cutover',
  approve: 'core.admin.migration.approve',
  export: 'core.admin.migration.export',
  viewSensitive: 'core.admin.migration.view_sensitive',
} as const;
