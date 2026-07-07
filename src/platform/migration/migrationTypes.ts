export type PbObjectType =
  | 'APPLICATION' | 'WINDOW' | 'DATAWINDOW' | 'MENU' | 'USER_OBJECT'
  | 'FUNCTION' | 'STRUCTURE' | 'QUERY' | 'PIPELINE' | 'PBL' | 'PBT'
  | 'SCRIPT' | 'STORED_PROCEDURE' | 'TRIGGER' | 'TABLE' | 'OTHER';

export type PbMigrationStatus =
  | 'DISCOVERED' | 'IN_REVIEW' | 'MAPPED' | 'READY' | 'MIGRATED'
  | 'DEFERRED' | 'RETIRED' | 'BLOCKED';

export type PbModernizationDecision =
  | 'REVIEW' | 'REBUILD' | 'REUSE_DATA_ONLY' | 'REPLACE_WITH_CORE_FEATURE'
  | 'REPLACE_WITH_MODULE_FEATURE' | 'RETIRE' | 'DEFER';

export type ComplexityLevel = 'UNKNOWN' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type PlanStatus =
  | 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'IN_PROGRESS' | 'PAUSED'
  | 'COMPLETED' | 'CANCELLED' | 'REJECTED';

export type MigrationStrategy =
  | 'BIG_BANG' | 'PHASED' | 'MODULE_BY_MODULE' | 'TABLE_BY_TABLE'
  | 'HYBRID' | 'PARALLEL_RUN';

export type MigrationScope =
  | 'FULL_TABLE' | 'FILTERED' | 'REFERENCE_ONLY' | 'TRANSACTION_ONLY'
  | 'HISTORY_ONLY' | 'EXCLUDED';

export type ReadinessStatus =
  | 'NOT_ASSESSED' | 'INCOMPLETE_MAPPING' | 'READY_FOR_TEST'
  | 'TESTED_WITH_ISSUES' | 'READY_FOR_PROD' | 'BLOCKED'
  | 'DEFERRED' | 'COMPLETED';

export type ReconciliationStatus =
  | 'NOT_RUN' | 'MATCHED' | 'MISMATCHED' | 'PARTIAL' | 'FAILED'
  | 'WAIVED' | 'ACCEPTED_WITH_DIFFERENCE';

export type ReconciliationType =
  | 'ROW_COUNT' | 'CHECKSUM' | 'AMOUNT_TOTAL' | 'KEY_MATCH'
  | 'SAMPLE_COMPARE' | 'CUSTOM';

export type BatchType =
  | 'DISCOVERY' | 'TEST' | 'DRESS_REHEARSAL' | 'PRODUCTION'
  | 'ROLLBACK' | 'VALIDATION_ONLY' | 'RECONCILIATION_ONLY';

export type BatchStatus =
  | 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SCHEDULED' | 'RUNNING'
  | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED' | 'CANCELLED' | 'ROLLED_BACK';

export type RunStatus =
  | 'PENDING' | 'RUNNING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS'
  | 'FAILED' | 'CANCELLED' | 'ROLLED_BACK';

export type TableRunStatus =
  | 'PENDING' | 'RUNNING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS'
  | 'FAILED' | 'SKIPPED' | 'ROLLED_BACK';

export type ValidationType =
  | 'REQUIRED_FIELD' | 'DATA_TYPE' | 'VALUE_RANGE' | 'REFERENCE_VALUE'
  | 'FOREIGN_KEY' | 'UNIQUENESS' | 'ROW_COUNT' | 'CHECKSUM'
  | 'CUSTOM_SQL' | 'BUSINESS_RULE';

export type ValidationStatus =
  | 'PENDING' | 'PASSED' | 'FAILED' | 'WARNING' | 'WAIVED' | 'ERROR';

export type ValidationSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type IssueType =
  | 'MAPPING_GAP' | 'DATA_QUALITY' | 'REFERENCE_VALUE' | 'RELATIONSHIP'
  | 'VALIDATION_FAILURE' | 'RECONCILIATION_DIFFERENCE' | 'PERFORMANCE'
  | 'POWERBUILDER_LOGIC' | 'BUSINESS_DECISION' | 'SECURITY' | 'OTHER';

export type IssueStatus =
  | 'OPEN' | 'IN_PROGRESS' | 'PENDING_DECISION' | 'RESOLVED'
  | 'WAIVED' | 'CLOSED' | 'REOPENED';

export type CutoverCheckCategory =
  | 'DATA' | 'MAPPING' | 'VALIDATION' | 'RECONCILIATION' | 'SECURITY'
  | 'WORKFLOW' | 'REPORTING' | 'BUSINESS_SIGNOFF' | 'TECHNICAL' | 'ROLLBACK';

export type CutoverCheckStatus =
  | 'NOT_ASSESSED' | 'PASSED' | 'FAILED' | 'WARNING' | 'WAIVED' | 'BLOCKED';

export interface PowerBuilderObjectInventory {
  id: string;
  object_name: string;
  object_type: PbObjectType;
  library_name: string | null;
  file_path: string | null;
  parent_object_name: string | null;
  related_table_name: string | null;
  related_module_code: string | null;
  business_area: string | null;
  description: string | null;
  migration_status: PbMigrationStatus;
  modernization_decision: PbModernizationDecision;
  complexity_level: ComplexityLevel;
  risk_level: RiskLevel;
  owner_user_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MigrationPlan {
  id: string;
  plan_code: string;
  plan_name: string;
  description: string | null;
  source_system: string;
  target_system: string;
  plan_status: PlanStatus;
  migration_strategy: MigrationStrategy;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  owner_user_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  workflow_instance_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MigrationPlanTable {
  id: string;
  migration_plan_id: string;
  legacy_table_map_id: string | null;
  source_table_name: string;
  target_table_name: string | null;
  modern_entity_name: string | null;
  migration_order: number;
  migration_scope: MigrationScope;
  readiness_status: ReadinessStatus;
  include_in_migration: boolean;
  estimated_record_count: number | null;
  actual_record_count: number | null;
  mapping_completeness_percent: number | null;
  validation_pass_percent: number | null;
  reconciliation_status: ReconciliationStatus | null;
  blocking_issue_count: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MigrationBatch {
  id: string;
  migration_plan_id: string | null;
  batch_code: string;
  batch_name: string;
  description: string | null;
  batch_type: BatchType;
  batch_status: BatchStatus;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  initiated_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  workflow_instance_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MigrationRun {
  id: string;
  migration_batch_id: string;
  run_number: number;
  run_status: RunStatus;
  started_at: string | null;
  completed_at: string | null;
  started_by: string | null;
  completed_by: string | null;
  total_tables: number;
  total_source_records: number;
  total_target_records: number;
  total_success_records: number;
  total_failed_records: number;
  total_warning_records: number;
  error_summary: string | null;
  run_log_url: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

export interface MigrationTableRun {
  id: string;
  migration_run_id: string;
  migration_plan_table_id: string | null;
  source_table_name: string;
  target_table_name: string | null;
  table_run_status: TableRunStatus;
  started_at: string | null;
  completed_at: string | null;
  source_record_count: number;
  target_record_count: number;
  success_record_count: number;
  failed_record_count: number;
  warning_record_count: number;
  skipped_record_count: number;
  error_summary: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

export interface MigrationValidationRule {
  id: string;
  rule_code: string;
  rule_name: string;
  description: string | null;
  source_table_name: string | null;
  target_table_name: string | null;
  column_name: string | null;
  validation_type: ValidationType;
  severity: ValidationSeverity;
  rule_expression: string | null;
  expected_result: string | null;
  is_blocking: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MigrationValidationResult {
  id: string;
  migration_run_id: string | null;
  migration_table_run_id: string | null;
  validation_rule_id: string | null;
  rule_code: string | null;
  source_table_name: string | null;
  target_table_name: string | null;
  validation_status: ValidationStatus;
  severity: ValidationSeverity;
  checked_record_count: number | null;
  failed_record_count: number | null;
  sample_failed_records: unknown;
  message: string | null;
  details: unknown;
  validated_at: string | null;
  validated_by: string | null;
  created_at: string;
}

export interface MigrationReconciliationSummary {
  id: string;
  migration_run_id: string | null;
  migration_table_run_id: string | null;
  source_table_name: string;
  target_table_name: string | null;
  reconciliation_type: ReconciliationType;
  reconciliation_status: ReconciliationStatus;
  source_count: number | null;
  target_count: number | null;
  count_difference: number | null;
  source_checksum: string | null;
  target_checksum: string | null;
  amount_source: number | null;
  amount_target: number | null;
  amount_difference: number | null;
  mismatch_sample: unknown;
  is_accepted: boolean;
  accepted_by: string | null;
  accepted_at: string | null;
  acceptance_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface MigrationIssue {
  id: string;
  issue_code: string;
  issue_title: string;
  issue_description: string | null;
  issue_type: IssueType;
  severity: RiskLevel;
  issue_status: IssueStatus;
  source_table_name: string | null;
  target_table_name: string | null;
  powerbuilder_object_id: string | null;
  migration_plan_id: string | null;
  migration_batch_id: string | null;
  migration_run_id: string | null;
  assigned_to_user_id: string | null;
  raised_by: string | null;
  raised_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  is_cutover_blocker: boolean;
  workflow_instance_id: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

export interface CutoverReadinessCheck {
  id: string;
  check_code: string;
  check_name: string;
  description: string | null;
  check_category: CutoverCheckCategory;
  required_for_cutover: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CutoverReadinessResult {
  id: string;
  readiness_check_id: string | null;
  migration_plan_id: string | null;
  migration_batch_id: string | null;
  check_status: CutoverCheckStatus;
  evidence_summary: string | null;
  evidence_url: string | null;
  assessed_by: string | null;
  assessed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MigrationDashboardMetrics {
  plans: number;
  tablesReady: number;
  mappingGaps: number;
  openIssues: number;
  cutoverBlockers: number;
  validationFailures: number;
  reconciliationDifferences: number;
  lastBatchStatus: string | null;
  overallReadinessPercent: number;
  mappingCompletenessPercent: number;
  validationPassRate: number;
  reconciliationMatchedRate: number;
}

export interface MigrationReadinessSummary {
  planId: string | null;
  planName: string | null;
  totalTables: number;
  readyTables: number;
  blockedTables: number;
  incompleteMapping: number;
  openBlockers: number;
  cutoverReadinessPercent: number;
}

export interface MigrationFilters {
  status?: string;
  planId?: string;
  batchId?: string;
  search?: string;
  is_active?: boolean;
}

export type MigrationPlanFormValues = Partial<Omit<MigrationPlan, 'id' | 'created_at' | 'updated_at'>>;
export type MigrationBatchFormValues = Partial<Omit<MigrationBatch, 'id' | 'created_at' | 'updated_at'>>;
export type MigrationIssueFormValues = Partial<Omit<MigrationIssue, 'id' | 'created_at' | 'updated_at' | 'raised_at'>>;
export type MigrationValidationRuleFormValues = Partial<Omit<MigrationValidationRule, 'id' | 'created_at' | 'updated_at'>>;
export type CutoverReadinessFormValues = Partial<Omit<CutoverReadinessResult, 'id' | 'created_at' | 'updated_at'>>;
export type PbObjectFormValues = Partial<Omit<PowerBuilderObjectInventory, 'id' | 'created_at' | 'updated_at'>>;
export type MigrationPlanTableFormValues = Partial<Omit<MigrationPlanTable, 'id' | 'created_at' | 'updated_at'>>;
export type MigrationValidationResultFormValues = Partial<Omit<MigrationValidationResult, 'id' | 'created_at'>>;
export type MigrationReconciliationFormValues = Partial<Omit<MigrationReconciliationSummary, 'id' | 'created_at' | 'updated_at'>>;
