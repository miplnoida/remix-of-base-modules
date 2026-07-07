
CREATE TABLE IF NOT EXISTS public.mig_powerbuilder_object_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_name text NOT NULL, object_type text NOT NULL,
  library_name text, file_path text, parent_object_name text,
  related_table_name text, related_module_code text,
  business_area text, description text,
  migration_status text NOT NULL DEFAULT 'DISCOVERED',
  modernization_decision text NOT NULL DEFAULT 'REVIEW',
  complexity_level text NOT NULL DEFAULT 'UNKNOWN',
  risk_level text NOT NULL DEFAULT 'MEDIUM',
  owner_user_id uuid, reviewed_by uuid, reviewed_at timestamptz, notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (object_name, object_type, library_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mig_powerbuilder_object_inventory TO authenticated;
GRANT ALL ON public.mig_powerbuilder_object_inventory TO service_role;

CREATE TABLE IF NOT EXISTS public.mig_migration_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code text NOT NULL UNIQUE, plan_name text NOT NULL, description text,
  source_system text NOT NULL DEFAULT 'POWERBUILDER',
  target_system text NOT NULL DEFAULT 'NEW_PLATFORM',
  plan_status text NOT NULL DEFAULT 'DRAFT',
  migration_strategy text NOT NULL DEFAULT 'PHASED',
  planned_start_date date, planned_end_date date,
  actual_start_date date, actual_end_date date,
  owner_user_id uuid, approved_by uuid, approved_at timestamptz,
  workflow_instance_id uuid, notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mig_migration_plan TO authenticated;
GRANT ALL ON public.mig_migration_plan TO service_role;

CREATE TABLE IF NOT EXISTS public.mig_migration_plan_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_plan_id uuid NOT NULL REFERENCES public.mig_migration_plan(id) ON DELETE CASCADE,
  legacy_table_map_id uuid REFERENCES public.core_legacy_table_map(id) ON DELETE SET NULL,
  source_table_name text NOT NULL, target_table_name text, modern_entity_name text,
  migration_order integer NOT NULL DEFAULT 100,
  migration_scope text NOT NULL DEFAULT 'FULL_TABLE',
  readiness_status text NOT NULL DEFAULT 'NOT_ASSESSED',
  include_in_migration boolean NOT NULL DEFAULT true,
  estimated_record_count bigint, actual_record_count bigint,
  mapping_completeness_percent numeric, validation_pass_percent numeric,
  reconciliation_status text,
  blocking_issue_count integer NOT NULL DEFAULT 0,
  notes text, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mig_migration_plan_table TO authenticated;
GRANT ALL ON public.mig_migration_plan_table TO service_role;

CREATE TABLE IF NOT EXISTS public.mig_migration_batch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_plan_id uuid REFERENCES public.mig_migration_plan(id) ON DELETE SET NULL,
  batch_code text NOT NULL UNIQUE, batch_name text NOT NULL, description text,
  batch_type text NOT NULL DEFAULT 'TEST',
  batch_status text NOT NULL DEFAULT 'DRAFT',
  scheduled_start_at timestamptz, scheduled_end_at timestamptz,
  started_at timestamptz, completed_at timestamptz,
  initiated_by uuid, approved_by uuid, approved_at timestamptz,
  workflow_instance_id uuid, notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mig_migration_batch TO authenticated;
GRANT ALL ON public.mig_migration_batch TO service_role;

CREATE TABLE IF NOT EXISTS public.mig_migration_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_batch_id uuid NOT NULL REFERENCES public.mig_migration_batch(id) ON DELETE CASCADE,
  run_number integer NOT NULL DEFAULT 1,
  run_status text NOT NULL DEFAULT 'PENDING',
  started_at timestamptz, completed_at timestamptz,
  started_by uuid, completed_by uuid,
  total_tables integer NOT NULL DEFAULT 0,
  total_source_records bigint NOT NULL DEFAULT 0,
  total_target_records bigint NOT NULL DEFAULT 0,
  total_success_records bigint NOT NULL DEFAULT 0,
  total_failed_records bigint NOT NULL DEFAULT 0,
  total_warning_records bigint NOT NULL DEFAULT 0,
  error_summary text, run_log_url text, metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (migration_batch_id, run_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mig_migration_run TO authenticated;
GRANT ALL ON public.mig_migration_run TO service_role;

CREATE TABLE IF NOT EXISTS public.mig_migration_table_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_run_id uuid NOT NULL REFERENCES public.mig_migration_run(id) ON DELETE CASCADE,
  migration_plan_table_id uuid REFERENCES public.mig_migration_plan_table(id) ON DELETE SET NULL,
  source_table_name text NOT NULL, target_table_name text,
  table_run_status text NOT NULL DEFAULT 'PENDING',
  started_at timestamptz, completed_at timestamptz,
  source_record_count bigint NOT NULL DEFAULT 0,
  target_record_count bigint NOT NULL DEFAULT 0,
  success_record_count bigint NOT NULL DEFAULT 0,
  failed_record_count bigint NOT NULL DEFAULT 0,
  warning_record_count bigint NOT NULL DEFAULT 0,
  skipped_record_count bigint NOT NULL DEFAULT 0,
  error_summary text, metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mig_migration_table_run TO authenticated;
GRANT ALL ON public.mig_migration_table_run TO service_role;

CREATE TABLE IF NOT EXISTS public.mig_migration_validation_rule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code text NOT NULL UNIQUE, rule_name text NOT NULL, description text,
  source_table_name text, target_table_name text, column_name text,
  validation_type text NOT NULL,
  severity text NOT NULL DEFAULT 'ERROR',
  rule_expression text, expected_result text,
  is_blocking boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mig_migration_validation_rule TO authenticated;
GRANT ALL ON public.mig_migration_validation_rule TO service_role;

CREATE TABLE IF NOT EXISTS public.mig_migration_validation_result (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_run_id uuid REFERENCES public.mig_migration_run(id) ON DELETE CASCADE,
  migration_table_run_id uuid REFERENCES public.mig_migration_table_run(id) ON DELETE CASCADE,
  validation_rule_id uuid REFERENCES public.mig_migration_validation_rule(id) ON DELETE SET NULL,
  rule_code text, source_table_name text, target_table_name text,
  validation_status text NOT NULL DEFAULT 'PENDING',
  severity text NOT NULL DEFAULT 'ERROR',
  checked_record_count bigint, failed_record_count bigint,
  sample_failed_records jsonb, message text, details jsonb,
  validated_at timestamptz DEFAULT now(), validated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mig_migration_validation_result TO authenticated;
GRANT ALL ON public.mig_migration_validation_result TO service_role;

CREATE TABLE IF NOT EXISTS public.mig_migration_reconciliation_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_run_id uuid REFERENCES public.mig_migration_run(id) ON DELETE CASCADE,
  migration_table_run_id uuid REFERENCES public.mig_migration_table_run(id) ON DELETE CASCADE,
  source_table_name text NOT NULL, target_table_name text,
  reconciliation_type text NOT NULL DEFAULT 'ROW_COUNT',
  reconciliation_status text NOT NULL DEFAULT 'NOT_RUN',
  source_count bigint, target_count bigint, count_difference bigint,
  source_checksum text, target_checksum text,
  amount_source numeric, amount_target numeric, amount_difference numeric,
  mismatch_sample jsonb,
  is_accepted boolean NOT NULL DEFAULT false,
  accepted_by uuid, accepted_at timestamptz, acceptance_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mig_migration_reconciliation_summary TO authenticated;
GRANT ALL ON public.mig_migration_reconciliation_summary TO service_role;

CREATE TABLE IF NOT EXISTS public.mig_migration_issue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_code text NOT NULL UNIQUE, issue_title text NOT NULL, issue_description text,
  issue_type text NOT NULL DEFAULT 'DATA_QUALITY',
  severity text NOT NULL DEFAULT 'MEDIUM',
  issue_status text NOT NULL DEFAULT 'OPEN',
  source_table_name text, target_table_name text,
  powerbuilder_object_id uuid REFERENCES public.mig_powerbuilder_object_inventory(id) ON DELETE SET NULL,
  migration_plan_id uuid REFERENCES public.mig_migration_plan(id) ON DELETE SET NULL,
  migration_batch_id uuid REFERENCES public.mig_migration_batch(id) ON DELETE SET NULL,
  migration_run_id uuid REFERENCES public.mig_migration_run(id) ON DELETE SET NULL,
  assigned_to_user_id uuid, raised_by uuid,
  raised_at timestamptz NOT NULL DEFAULT now(),
  resolved_by uuid, resolved_at timestamptz, resolution_notes text,
  is_cutover_blocker boolean NOT NULL DEFAULT false,
  workflow_instance_id uuid, metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mig_migration_issue TO authenticated;
GRANT ALL ON public.mig_migration_issue TO service_role;

CREATE TABLE IF NOT EXISTS public.mig_cutover_readiness_check (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_code text NOT NULL UNIQUE, check_name text NOT NULL, description text,
  check_category text NOT NULL DEFAULT 'DATA',
  required_for_cutover boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mig_cutover_readiness_check TO authenticated;
GRANT ALL ON public.mig_cutover_readiness_check TO service_role;

CREATE TABLE IF NOT EXISTS public.mig_cutover_readiness_result (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  readiness_check_id uuid REFERENCES public.mig_cutover_readiness_check(id) ON DELETE SET NULL,
  migration_plan_id uuid REFERENCES public.mig_migration_plan(id) ON DELETE CASCADE,
  migration_batch_id uuid REFERENCES public.mig_migration_batch(id) ON DELETE CASCADE,
  check_status text NOT NULL DEFAULT 'NOT_ASSESSED',
  evidence_summary text, evidence_url text,
  assessed_by uuid, assessed_at timestamptz,
  approved_by uuid, approved_at timestamptz, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mig_cutover_readiness_result TO authenticated;
GRANT ALL ON public.mig_cutover_readiness_result TO service_role;

INSERT INTO public.core_admin_route_registry
  (route_path, page_name, admin_domain, canonical_status, owner_module_code, requires_permission, show_in_platform_admin, is_active)
VALUES
  ('/admin/migration-control', 'Migration Control Centre', 'MIGRATION', 'CANONICAL', 'MIG', 'core.admin.migration.view', true, true)
ON CONFLICT (route_path) DO UPDATE SET
  page_name = EXCLUDED.page_name, admin_domain = EXCLUDED.admin_domain,
  canonical_status = EXCLUDED.canonical_status, owner_module_code = EXCLUDED.owner_module_code,
  requires_permission = EXCLUDED.requires_permission,
  show_in_platform_admin = EXCLUDED.show_in_platform_admin,
  is_active = EXCLUDED.is_active, updated_at = now();

INSERT INTO public.core_table_registry
  (table_name, ownership_type, module_code, domain_code, table_category, is_legacy_table, data_classification, lifecycle_status, canonical_admin_route)
VALUES
  ('mig_powerbuilder_object_inventory','PLATFORM','MIG','MIGRATION','MIGRATION',false,'INTERNAL','ACTIVE','/admin/migration-control'),
  ('mig_migration_plan','PLATFORM','MIG','MIGRATION','MIGRATION',false,'INTERNAL','ACTIVE','/admin/migration-control'),
  ('mig_migration_plan_table','PLATFORM','MIG','MIGRATION','MIGRATION',false,'INTERNAL','ACTIVE','/admin/migration-control'),
  ('mig_migration_batch','PLATFORM','MIG','MIGRATION','MIGRATION',false,'INTERNAL','ACTIVE','/admin/migration-control'),
  ('mig_migration_run','PLATFORM','MIG','MIGRATION','MIGRATION',false,'INTERNAL','ACTIVE','/admin/migration-control'),
  ('mig_migration_table_run','PLATFORM','MIG','MIGRATION','MIGRATION',false,'INTERNAL','ACTIVE','/admin/migration-control'),
  ('mig_migration_validation_rule','PLATFORM','MIG','MIGRATION','MIGRATION',false,'INTERNAL','ACTIVE','/admin/migration-control'),
  ('mig_migration_validation_result','PLATFORM','MIG','MIGRATION','MIGRATION',false,'CONFIDENTIAL','ACTIVE','/admin/migration-control'),
  ('mig_migration_reconciliation_summary','PLATFORM','MIG','MIGRATION','MIGRATION',false,'CONFIDENTIAL','ACTIVE','/admin/migration-control'),
  ('mig_migration_issue','PLATFORM','MIG','MIGRATION','MIGRATION',false,'CONFIDENTIAL','ACTIVE','/admin/migration-control'),
  ('mig_cutover_readiness_check','PLATFORM','MIG','MIGRATION','MIGRATION',false,'INTERNAL','ACTIVE','/admin/migration-control'),
  ('mig_cutover_readiness_result','PLATFORM','MIG','MIGRATION','MIGRATION',false,'INTERNAL','ACTIVE','/admin/migration-control')
ON CONFLICT (table_name) DO NOTHING;

INSERT INTO public.core_permission_registry
  (permission_key, permission_name, module_code, domain_code, permission_scope, action_code, risk_level, is_platform_permission, is_sensitive_permission, is_admin_permission, description, is_active)
VALUES
  ('core.admin.migration.view','View Migration Control Centre','MIG','MIGRATION','ADMIN','view','MEDIUM',true,false,true,'View Migration Control Centre',true),
  ('core.admin.migration.manage_plans','Manage Migration Plans','MIG','MIGRATION','ADMIN','manage','HIGH',true,true,true,'Manage migration plans',true),
  ('core.admin.migration.manage_batches','Manage Migration Batches','MIG','MIGRATION','ADMIN','manage','HIGH',true,true,true,'Manage migration batches',true),
  ('core.admin.migration.manage_runs','Manage Migration Runs','MIG','MIGRATION','ADMIN','manage','HIGH',true,true,true,'Manage migration runs',true),
  ('core.admin.migration.manage_validation_rules','Manage Validation Rules','MIG','MIGRATION','ADMIN','manage','HIGH',true,true,true,'Manage validation rules and results',true),
  ('core.admin.migration.manage_reconciliation','Manage Reconciliation','MIG','MIGRATION','ADMIN','manage','HIGH',true,true,true,'Manage reconciliation summaries',true),
  ('core.admin.migration.manage_issues','Manage Migration Issues','MIG','MIGRATION','ADMIN','manage','MEDIUM',true,false,true,'Manage migration issues',true),
  ('core.admin.migration.manage_cutover','Manage Cutover Readiness','MIG','MIGRATION','ADMIN','manage','CRITICAL',true,true,true,'Manage cutover readiness',true),
  ('core.admin.migration.approve','Approve Migration Actions','MIG','MIGRATION','ADMIN','approve','CRITICAL',true,true,true,'Approve migration actions',true),
  ('core.admin.migration.export','Export Migration Data','MIG','MIGRATION','ADMIN','export','HIGH',true,true,true,'Export migration data',true),
  ('core.admin.migration.view_sensitive','View Sensitive Migration Data','MIG','MIGRATION','ADMIN','view','CRITICAL',true,true,true,'View sensitive migration data',true)
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO public.core_audit_event_type (event_code, event_name, module_code, event_category, default_severity, default_risk_level, is_admin_event, is_migration_event, description, is_active) VALUES
  ('MIGRATION_PLAN_CREATED','Migration Plan Created','MIG','MIGRATION','INFO','MEDIUM',true,true,'Migration plan created',true),
  ('MIGRATION_PLAN_UPDATED','Migration Plan Updated','MIG','MIGRATION','INFO','MEDIUM',true,true,'Migration plan updated',true),
  ('MIGRATION_PLAN_SUBMITTED','Migration Plan Submitted','MIG','MIGRATION','INFO','MEDIUM',true,true,'Migration plan submitted',true),
  ('MIGRATION_PLAN_APPROVED','Migration Plan Approved','MIG','MIGRATION','INFO','HIGH',true,true,'Migration plan approved',true),
  ('MIGRATION_PLAN_REJECTED','Migration Plan Rejected','MIG','MIGRATION','WARN','HIGH',true,true,'Migration plan rejected',true),
  ('MIGRATION_PLAN_TABLE_ADDED','Plan Table Added','MIG','MIGRATION','INFO','LOW',true,true,'Table added to plan',true),
  ('MIGRATION_PLAN_TABLE_UPDATED','Plan Table Updated','MIG','MIGRATION','INFO','LOW',true,true,'Plan table updated',true),
  ('MIGRATION_PLAN_TABLE_REMOVED','Plan Table Removed','MIG','MIGRATION','WARN','MEDIUM',true,true,'Plan table removed',true),
  ('MIGRATION_BATCH_CREATED','Migration Batch Created','MIG','MIGRATION','INFO','MEDIUM',true,true,'Batch created',true),
  ('MIGRATION_BATCH_UPDATED','Migration Batch Updated','MIG','MIGRATION','INFO','MEDIUM',true,true,'Batch updated',true),
  ('MIGRATION_BATCH_SUBMITTED','Migration Batch Submitted','MIG','MIGRATION','INFO','MEDIUM',true,true,'Batch submitted',true),
  ('MIGRATION_BATCH_APPROVED','Migration Batch Approved','MIG','MIGRATION','INFO','HIGH',true,true,'Batch approved',true),
  ('MIGRATION_BATCH_STARTED','Migration Batch Started','MIG','MIGRATION','INFO','HIGH',true,true,'Batch started',true),
  ('MIGRATION_BATCH_COMPLETED','Migration Batch Completed','MIG','MIGRATION','INFO','MEDIUM',true,true,'Batch completed',true),
  ('MIGRATION_BATCH_FAILED','Migration Batch Failed','MIG','MIGRATION','ERROR','HIGH',true,true,'Batch failed',true),
  ('MIGRATION_BATCH_ROLLED_BACK','Migration Batch Rolled Back','MIG','MIGRATION','WARN','HIGH',true,true,'Batch rolled back',true),
  ('MIGRATION_RUN_STARTED','Migration Run Started','MIG','MIGRATION','INFO','MEDIUM',true,true,'Run started',true),
  ('MIGRATION_RUN_COMPLETED','Migration Run Completed','MIG','MIGRATION','INFO','MEDIUM',true,true,'Run completed',true),
  ('MIGRATION_RUN_FAILED','Migration Run Failed','MIG','MIGRATION','ERROR','HIGH',true,true,'Run failed',true),
  ('MIGRATION_TABLE_RUN_STARTED','Table Run Started','MIG','MIGRATION','INFO','LOW',true,true,'Table run started',true),
  ('MIGRATION_TABLE_RUN_COMPLETED','Table Run Completed','MIG','MIGRATION','INFO','LOW',true,true,'Table run completed',true),
  ('MIGRATION_TABLE_RUN_FAILED','Table Run Failed','MIG','MIGRATION','ERROR','MEDIUM',true,true,'Table run failed',true),
  ('MIGRATION_VALIDATION_RULE_CREATED','Validation Rule Created','MIG','MIGRATION','INFO','LOW',true,true,'Validation rule created',true),
  ('MIGRATION_VALIDATION_RULE_UPDATED','Validation Rule Updated','MIG','MIGRATION','INFO','LOW',true,true,'Validation rule updated',true),
  ('MIGRATION_VALIDATION_RESULT_RECORDED','Validation Result Recorded','MIG','MIGRATION','INFO','LOW',true,true,'Validation result recorded',true),
  ('MIGRATION_RECONCILIATION_RECORDED','Reconciliation Recorded','MIG','MIGRATION','INFO','MEDIUM',true,true,'Reconciliation recorded',true),
  ('MIGRATION_RECONCILIATION_ACCEPTED_WITH_DIFFERENCE','Reconciliation Accepted With Difference','MIG','MIGRATION','WARN','HIGH',true,true,'Reconciliation accepted with difference',true),
  ('MIGRATION_ISSUE_CREATED','Migration Issue Created','MIG','MIGRATION','INFO','MEDIUM',true,true,'Issue created',true),
  ('MIGRATION_ISSUE_UPDATED','Migration Issue Updated','MIG','MIGRATION','INFO','LOW',true,true,'Issue updated',true),
  ('MIGRATION_ISSUE_RESOLVED','Migration Issue Resolved','MIG','MIGRATION','INFO','LOW',true,true,'Issue resolved',true),
  ('MIGRATION_ISSUE_WAIVED','Migration Issue Waived','MIG','MIGRATION','WARN','HIGH',true,true,'Issue waived',true),
  ('MIGRATION_CUTOVER_CHECK_CREATED','Cutover Check Created','MIG','MIGRATION','INFO','LOW',true,true,'Cutover check created',true),
  ('MIGRATION_CUTOVER_RESULT_UPDATED','Cutover Result Updated','MIG','MIGRATION','INFO','MEDIUM',true,true,'Cutover result updated',true),
  ('MIGRATION_CUTOVER_APPROVED','Cutover Approved','MIG','MIGRATION','INFO','CRITICAL',true,true,'Cutover approved',true),
  ('POWERBUILDER_OBJECT_DISCOVERED','PB Object Discovered','MIG','MIGRATION','INFO','LOW',true,true,'PB object discovered',true),
  ('POWERBUILDER_OBJECT_UPDATED','PB Object Updated','MIG','MIGRATION','INFO','LOW',true,true,'PB object updated',true),
  ('POWERBUILDER_OBJECT_REVIEWED','PB Object Reviewed','MIG','MIGRATION','INFO','LOW',true,true,'PB object reviewed',true),
  ('MIGRATION_EXPORT_CREATED','Migration Export Created','MIG','MIGRATION','INFO','HIGH',true,true,'Migration export created',true)
ON CONFLICT (event_code) DO NOTHING;

INSERT INTO public.core_workflow_definition (workflow_code, workflow_name, module_code, entity_type, workflow_status, description, version)
VALUES
  ('MIGRATION_PLAN_APPROVAL','Migration Plan Approval','MIG','mig_migration_plan','DRAFT','Approval for migration plan',1),
  ('MIGRATION_BATCH_APPROVAL','Migration Batch Approval','MIG','mig_migration_batch','DRAFT','Approval for migration batch',1),
  ('MIGRATION_CUTOVER_APPROVAL','Migration Cutover Approval','MIG','mig_cutover_readiness_result','DRAFT','Approval for cutover readiness',1),
  ('MIGRATION_RECONCILIATION_WAIVER_APPROVAL','Reconciliation Waiver Approval','MIG','mig_migration_reconciliation_summary','DRAFT','Approval for reconciliation difference',1),
  ('MIGRATION_ISSUE_WAIVER_APPROVAL','Issue Waiver Approval','MIG','mig_migration_issue','DRAFT','Approval for waiving migration issue',1)
ON CONFLICT (workflow_code, version) DO NOTHING;

INSERT INTO public.mig_cutover_readiness_check (check_code, check_name, description, check_category, required_for_cutover, display_order) VALUES
  ('CUT_MAPPING_COMPLETE','All Column Mappings Complete','Every in-scope table has complete column mapping','MAPPING',true,10),
  ('CUT_REFERENCE_MAPPED','Reference Values Mapped','All legacy status/code values mapped to modern values','MAPPING',true,20),
  ('CUT_VALIDATION_PASSED','Validation Passed','All blocking validation rules pass','VALIDATION',true,30),
  ('CUT_RECONCILIATION_MATCHED','Reconciliation Matched','Source-target reconciliation matched or accepted','RECONCILIATION',true,40),
  ('CUT_NO_OPEN_BLOCKERS','No Open Cutover Blockers','No open issues flagged as cutover blockers','DATA',true,50),
  ('CUT_ROLLBACK_READY','Rollback Plan Ready','Documented rollback procedure available','ROLLBACK',true,60),
  ('CUT_BUSINESS_SIGNOFF','Business Signoff','Business owner signoff obtained','BUSINESS_SIGNOFF',true,70),
  ('CUT_SECURITY_REVIEW','Security Review Completed','Security review completed','SECURITY',true,80)
ON CONFLICT (check_code) DO NOTHING;

INSERT INTO public.core_reference_group (group_code, group_name, module_code, description, is_active)
VALUES
  ('MIGRATION_PLAN_STATUS','Migration Plan Status','MIG','Migration plan lifecycle statuses',true),
  ('MIGRATION_STRATEGY','Migration Strategy','MIG','Migration strategy options',true),
  ('MIGRATION_BATCH_TYPE','Migration Batch Type','MIG','Migration batch types',true),
  ('MIGRATION_BATCH_STATUS','Migration Batch Status','MIG','Migration batch statuses',true),
  ('MIGRATION_RUN_STATUS','Migration Run Status','MIG','Migration run statuses',true),
  ('MIGRATION_TABLE_READINESS_STATUS','Migration Table Readiness','MIG','Per-table readiness',true),
  ('MIGRATION_SCOPE','Migration Scope','MIG','Migration scope options',true),
  ('MIGRATION_VALIDATION_TYPE','Migration Validation Type','MIG','Validation rule types',true),
  ('MIGRATION_VALIDATION_STATUS','Migration Validation Status','MIG','Validation result statuses',true),
  ('MIGRATION_RECONCILIATION_STATUS','Migration Reconciliation Status','MIG','Reconciliation statuses',true),
  ('MIGRATION_ISSUE_TYPE','Migration Issue Type','MIG','Migration issue types',true),
  ('MIGRATION_ISSUE_STATUS','Migration Issue Status','MIG','Migration issue statuses',true),
  ('MIGRATION_CUTOVER_CHECK_STATUS','Migration Cutover Check Status','MIG','Cutover check statuses',true),
  ('POWERBUILDER_OBJECT_TYPE','PowerBuilder Object Type','MIG','PB object types',true),
  ('POWERBUILDER_MODERNIZATION_DECISION','PB Modernization Decision','MIG','Modernization decisions',true),
  ('POWERBUILDER_OBJECT_MIGRATION_STATUS','PB Object Migration Status','MIG','PB object migration statuses',true)
ON CONFLICT (group_code) DO NOTHING;
