import { supabase } from '@/integrations/supabase/client';
import { logAction } from '@/platform/audit/auditService';
import { MIGRATION_EVENTS } from './migrationEvents';
import type {
  CutoverReadinessCheck,
  CutoverReadinessFormValues,
  CutoverReadinessResult,
  MigrationBatch,
  MigrationBatchFormValues,
  MigrationDashboardMetrics,
  MigrationFilters,
  MigrationIssue,
  MigrationIssueFormValues,
  MigrationPlan,
  MigrationPlanFormValues,
  MigrationPlanTable,
  MigrationPlanTableFormValues,
  MigrationReadinessSummary,
  MigrationReconciliationFormValues,
  MigrationReconciliationSummary,
  MigrationRun,
  MigrationTableRun,
  MigrationValidationResult,
  MigrationValidationResultFormValues,
  MigrationValidationRule,
  MigrationValidationRuleFormValues,
  PbObjectFormValues,
  PowerBuilderObjectInventory,
} from './migrationTypes';

const db = supabase as any;

const T = {
  pb: 'mig_powerbuilder_object_inventory',
  plan: 'mig_migration_plan',
  planTable: 'mig_migration_plan_table',
  batch: 'mig_migration_batch',
  run: 'mig_migration_run',
  tableRun: 'mig_migration_table_run',
  vRule: 'mig_migration_validation_rule',
  vResult: 'mig_migration_validation_result',
  recon: 'mig_migration_reconciliation_summary',
  issue: 'mig_migration_issue',
  cutCheck: 'mig_cutover_readiness_check',
  cutResult: 'mig_cutover_readiness_result',
} as const;

const audit = (
  event_code: string,
  action: string,
  entity_type: string,
  entity_id: string | null,
  extra: Record<string, unknown> = {},
) =>
  logAction({
    event_code,
    action,
    module_code: 'MIG',
    domain_code: 'MIGRATION',
    entity_type,
    entity_id: entity_id ?? undefined,
    ...extra,
  });

// ---------------- PowerBuilder inventory ----------------
export async function getPowerBuilderObjects(filters: MigrationFilters = {}): Promise<PowerBuilderObjectInventory[]> {
  let q = db.from(T.pb).select('*').order('object_name');
  if (typeof filters.is_active === 'boolean') q = q.eq('is_active', filters.is_active);
  if (filters.search) {
    const s = `%${filters.search}%`;
    q = q.or(`object_name.ilike.${s},library_name.ilike.${s},business_area.ilike.${s}`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PowerBuilderObjectInventory[];
}
export async function getPowerBuilderObject(id: string) {
  const { data, error } = await db.from(T.pb).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as PowerBuilderObjectInventory | null;
}
export async function createPowerBuilderObject(payload: PbObjectFormValues) {
  const { data, error } = await db.from(T.pb).insert(payload).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.powerbuilderObject.discovered, 'CREATE', 'mig_powerbuilder_object_inventory', data.id, { after_value: data });
  return data as PowerBuilderObjectInventory;
}
export async function updatePowerBuilderObject(id: string, payload: PbObjectFormValues) {
  const { data, error } = await db.from(T.pb).update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.powerbuilderObject.updated, 'UPDATE', 'mig_powerbuilder_object_inventory', id, { after_value: data });
  return data as PowerBuilderObjectInventory;
}
export async function reviewPowerBuilderObject(id: string, payload: PbObjectFormValues) {
  const { data, error } = await db.from(T.pb).update({ ...payload, reviewed_at: new Date().toISOString() }).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.powerbuilderObject.reviewed, 'UPDATE', 'mig_powerbuilder_object_inventory', id, { after_value: data });
  return data as PowerBuilderObjectInventory;
}
export async function deactivatePowerBuilderObject(id: string) {
  await db.from(T.pb).update({ is_active: false }).eq('id', id);
  await audit(MIGRATION_EVENTS.powerbuilderObject.updated, 'UPDATE', 'mig_powerbuilder_object_inventory', id, { notes: 'deactivated' });
}
export async function reactivatePowerBuilderObject(id: string) {
  await db.from(T.pb).update({ is_active: true }).eq('id', id);
  await audit(MIGRATION_EVENTS.powerbuilderObject.updated, 'UPDATE', 'mig_powerbuilder_object_inventory', id, { notes: 'reactivated' });
}

// ---------------- Plans ----------------
export async function getMigrationPlans(filters: MigrationFilters = {}): Promise<MigrationPlan[]> {
  let q = db.from(T.plan).select('*').order('created_at', { ascending: false });
  if (typeof filters.is_active === 'boolean') q = q.eq('is_active', filters.is_active);
  if (filters.status) q = q.eq('plan_status', filters.status);
  if (filters.search) {
    const s = `%${filters.search}%`;
    q = q.or(`plan_code.ilike.${s},plan_name.ilike.${s}`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MigrationPlan[];
}
export async function getMigrationPlan(id: string) {
  const { data, error } = await db.from(T.plan).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as MigrationPlan | null;
}
export async function createMigrationPlan(payload: MigrationPlanFormValues) {
  const { data, error } = await db.from(T.plan).insert(payload).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.plan.created, 'CREATE', 'mig_migration_plan', data.id, { after_value: data });
  return data as MigrationPlan;
}
export async function updateMigrationPlan(id: string, payload: MigrationPlanFormValues) {
  const { data, error } = await db.from(T.plan).update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.plan.updated, 'UPDATE', 'mig_migration_plan', id, { after_value: data });
  return data as MigrationPlan;
}
export async function submitMigrationPlan(id: string) {
  const { data, error } = await db.from(T.plan).update({ plan_status: 'IN_REVIEW' }).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.plan.submitted, 'UPDATE', 'mig_migration_plan', id, { risk_level: 'MEDIUM' });
  return data as MigrationPlan;
}
export async function approveMigrationPlan(id: string) {
  const { data, error } = await db.from(T.plan).update({ plan_status: 'APPROVED', approved_at: new Date().toISOString() }).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.plan.approved, 'APPROVE', 'mig_migration_plan', id, { risk_level: 'HIGH', is_sensitive: true });
  return data as MigrationPlan;
}
export async function rejectMigrationPlan(id: string, reason: string) {
  const { data, error } = await db.from(T.plan).update({ plan_status: 'REJECTED', notes: reason }).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.plan.rejected, 'REJECT', 'mig_migration_plan', id, { reason, risk_level: 'HIGH' });
  return data as MigrationPlan;
}
export async function cancelMigrationPlan(id: string, reason: string) {
  const { data, error } = await db.from(T.plan).update({ plan_status: 'CANCELLED', notes: reason }).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.plan.updated, 'UPDATE', 'mig_migration_plan', id, { reason });
  return data as MigrationPlan;
}

// ---------------- Plan tables ----------------
export async function getMigrationPlanTables(planId: string): Promise<MigrationPlanTable[]> {
  const { data, error } = await db.from(T.planTable).select('*').eq('migration_plan_id', planId).order('migration_order');
  if (error) throw error;
  return (data ?? []) as MigrationPlanTable[];
}
export async function addMigrationPlanTable(payload: MigrationPlanTableFormValues) {
  const { data, error } = await db.from(T.planTable).insert(payload).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.planTable.added, 'CREATE', 'mig_migration_plan_table', data.id, { after_value: data });
  return data as MigrationPlanTable;
}
export async function updateMigrationPlanTable(id: string, payload: MigrationPlanTableFormValues) {
  const { data, error } = await db.from(T.planTable).update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.planTable.updated, 'UPDATE', 'mig_migration_plan_table', id, { after_value: data });
  return data as MigrationPlanTable;
}
export async function removeMigrationPlanTable(id: string) {
  await db.from(T.planTable).delete().eq('id', id);
  await audit(MIGRATION_EVENTS.planTable.removed, 'DELETE', 'mig_migration_plan_table', id, { risk_level: 'MEDIUM' });
}

export async function calculateMappingCompleteness(sourceTableName: string): Promise<number> {
  const { data: tableMap } = await db.from('core_legacy_table_map').select('id').eq('legacy_table_name', sourceTableName).maybeSingle();
  if (!tableMap?.id) return 0;
  const { data: cols } = await db.from('core_legacy_column_map').select('id, modern_field_name').eq('legacy_table_map_id', tableMap.id);
  if (!cols?.length) return 0;
  const mapped = cols.filter((c: any) => !!c.modern_field_name).length;
  return Math.round((mapped / cols.length) * 100);
}

export async function calculateTableReadiness(planTableId: string): Promise<number> {
  const { data: pt } = await db.from(T.planTable).select('*').eq('id', planTableId).maybeSingle();
  if (!pt) return 0;
  const mapping = pt.mapping_completeness_percent ?? 0;
  const validation = pt.validation_pass_percent ?? 0;
  const recon = pt.reconciliation_status === 'MATCHED' || pt.reconciliation_status === 'ACCEPTED_WITH_DIFFERENCE' ? 100 : 0;
  const blockers = pt.blocking_issue_count > 0 ? 0 : 100;
  return Math.round((mapping + validation + recon + blockers) / 4);
}

// ---------------- Batches ----------------
export async function getMigrationBatches(filters: MigrationFilters = {}): Promise<MigrationBatch[]> {
  let q = db.from(T.batch).select('*').order('created_at', { ascending: false });
  if (filters.planId) q = q.eq('migration_plan_id', filters.planId);
  if (filters.status) q = q.eq('batch_status', filters.status);
  if (typeof filters.is_active === 'boolean') q = q.eq('is_active', filters.is_active);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MigrationBatch[];
}
export async function getMigrationBatch(id: string) {
  const { data, error } = await db.from(T.batch).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as MigrationBatch | null;
}
export async function createMigrationBatch(payload: MigrationBatchFormValues) {
  const { data, error } = await db.from(T.batch).insert(payload).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.batch.created, 'CREATE', 'mig_migration_batch', data.id, { after_value: data });
  return data as MigrationBatch;
}
export async function updateMigrationBatch(id: string, payload: MigrationBatchFormValues) {
  const { data, error } = await db.from(T.batch).update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.batch.updated, 'UPDATE', 'mig_migration_batch', id, { after_value: data });
  return data as MigrationBatch;
}
export async function submitMigrationBatch(id: string) {
  const { data, error } = await db.from(T.batch).update({ batch_status: 'PENDING_APPROVAL' }).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.batch.submitted, 'UPDATE', 'mig_migration_batch', id);
  return data as MigrationBatch;
}
export async function approveMigrationBatch(id: string) {
  const { data, error } = await db.from(T.batch).update({ batch_status: 'APPROVED', approved_at: new Date().toISOString() }).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.batch.approved, 'APPROVE', 'mig_migration_batch', id, { risk_level: 'HIGH', is_sensitive: true });
  return data as MigrationBatch;
}
export async function startMigrationBatch(id: string) {
  const { data, error } = await db.from(T.batch).update({ batch_status: 'RUNNING', started_at: new Date().toISOString() }).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.batch.started, 'UPDATE', 'mig_migration_batch', id, { risk_level: 'HIGH' });
  return data as MigrationBatch;
}
export async function completeMigrationBatch(id: string, payload: MigrationBatchFormValues = {}) {
  const { data, error } = await db.from(T.batch).update({ ...payload, batch_status: payload.batch_status ?? 'COMPLETED', completed_at: new Date().toISOString() }).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.batch.completed, 'UPDATE', 'mig_migration_batch', id);
  return data as MigrationBatch;
}
export async function failMigrationBatch(id: string, reason: string) {
  const { data, error } = await db.from(T.batch).update({ batch_status: 'FAILED', notes: reason }).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.batch.failed, 'UPDATE', 'mig_migration_batch', id, { reason, severity: 'ERROR', risk_level: 'HIGH' });
  return data as MigrationBatch;
}

// ---------------- Runs ----------------
export async function getMigrationRuns(batchId: string): Promise<MigrationRun[]> {
  const { data, error } = await db.from(T.run).select('*').eq('migration_batch_id', batchId).order('run_number');
  if (error) throw error;
  return (data ?? []) as MigrationRun[];
}
export async function createMigrationRun(payload: Partial<MigrationRun>) {
  const { data, error } = await db.from(T.run).insert(payload).select('*').single();
  if (error) throw error;
  return data as MigrationRun;
}
export async function startMigrationRun(id: string) {
  const { data, error } = await db.from(T.run).update({ run_status: 'RUNNING', started_at: new Date().toISOString() }).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.run.started, 'UPDATE', 'mig_migration_run', id);
  return data as MigrationRun;
}
export async function completeMigrationRun(id: string, payload: Partial<MigrationRun> = {}) {
  const { data, error } = await db.from(T.run).update({ ...payload, run_status: payload.run_status ?? 'COMPLETED', completed_at: new Date().toISOString() }).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.run.completed, 'UPDATE', 'mig_migration_run', id);
  return data as MigrationRun;
}
export async function failMigrationRun(id: string, reason: string) {
  const { data, error } = await db.from(T.run).update({ run_status: 'FAILED', error_summary: reason }).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.run.failed, 'UPDATE', 'mig_migration_run', id, { reason, severity: 'ERROR', risk_level: 'HIGH' });
  return data as MigrationRun;
}

export async function getMigrationTableRuns(runId: string): Promise<MigrationTableRun[]> {
  const { data, error } = await db.from(T.tableRun).select('*').eq('migration_run_id', runId).order('source_table_name');
  if (error) throw error;
  return (data ?? []) as MigrationTableRun[];
}
export async function createMigrationTableRun(payload: Partial<MigrationTableRun>) {
  const { data, error } = await db.from(T.tableRun).insert(payload).select('*').single();
  if (error) throw error;
  return data as MigrationTableRun;
}
export async function updateMigrationTableRun(id: string, payload: Partial<MigrationTableRun>) {
  const { data, error } = await db.from(T.tableRun).update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data as MigrationTableRun;
}

// ---------------- Validation ----------------
export async function getValidationRules(filters: MigrationFilters = {}): Promise<MigrationValidationRule[]> {
  let q = db.from(T.vRule).select('*').order('rule_code');
  if (typeof filters.is_active === 'boolean') q = q.eq('is_active', filters.is_active);
  if (filters.search) {
    const s = `%${filters.search}%`;
    q = q.or(`rule_code.ilike.${s},rule_name.ilike.${s}`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MigrationValidationRule[];
}
export async function createValidationRule(payload: MigrationValidationRuleFormValues) {
  const { data, error } = await db.from(T.vRule).insert(payload).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.validation.ruleCreated, 'CREATE', 'mig_migration_validation_rule', data.id, { after_value: data });
  return data as MigrationValidationRule;
}
export async function updateValidationRule(id: string, payload: MigrationValidationRuleFormValues) {
  const { data, error } = await db.from(T.vRule).update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.validation.ruleUpdated, 'UPDATE', 'mig_migration_validation_rule', id, { after_value: data });
  return data as MigrationValidationRule;
}
export async function deactivateValidationRule(id: string) {
  await db.from(T.vRule).update({ is_active: false }).eq('id', id);
  await audit(MIGRATION_EVENTS.validation.ruleUpdated, 'UPDATE', 'mig_migration_validation_rule', id, { notes: 'deactivated' });
}
export async function reactivateValidationRule(id: string) {
  await db.from(T.vRule).update({ is_active: true }).eq('id', id);
  await audit(MIGRATION_EVENTS.validation.ruleUpdated, 'UPDATE', 'mig_migration_validation_rule', id, { notes: 'reactivated' });
}
export async function getValidationResults(filters: MigrationFilters = {}): Promise<MigrationValidationResult[]> {
  let q = db.from(T.vResult).select('*').order('created_at', { ascending: false });
  if (filters.status) q = q.eq('validation_status', filters.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MigrationValidationResult[];
}
export async function recordValidationResult(payload: MigrationValidationResultFormValues) {
  const { data, error } = await db.from(T.vResult).insert(payload).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.validation.resultRecorded, 'CREATE', 'mig_migration_validation_result', data.id, { after_value: data });
  return data as MigrationValidationResult;
}
export async function waiveValidationResult(id: string, reason: string) {
  const { data, error } = await db.from(T.vResult).update({ validation_status: 'WAIVED', message: reason }).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.validation.resultRecorded, 'UPDATE', 'mig_migration_validation_result', id, { reason, risk_level: 'HIGH', is_sensitive: true });
  return data as MigrationValidationResult;
}

// ---------------- Reconciliation ----------------
export async function getReconciliationSummaries(filters: MigrationFilters = {}): Promise<MigrationReconciliationSummary[]> {
  let q = db.from(T.recon).select('*').order('created_at', { ascending: false });
  if (filters.status) q = q.eq('reconciliation_status', filters.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MigrationReconciliationSummary[];
}
export async function recordReconciliationSummary(payload: MigrationReconciliationFormValues) {
  const { data, error } = await db.from(T.recon).insert(payload).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.reconciliation.recorded, 'CREATE', 'mig_migration_reconciliation_summary', data.id, { after_value: data });
  return data as MigrationReconciliationSummary;
}
export async function acceptReconciliationDifference(id: string, reason: string) {
  const { data, error } = await db.from(T.recon).update({
    reconciliation_status: 'ACCEPTED_WITH_DIFFERENCE',
    is_accepted: true,
    accepted_at: new Date().toISOString(),
    acceptance_reason: reason,
  }).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.reconciliation.acceptedWithDifference, 'APPROVE', 'mig_migration_reconciliation_summary', id, {
    reason, risk_level: 'HIGH', is_sensitive: true,
  });
  return data as MigrationReconciliationSummary;
}

// ---------------- Issues ----------------
export async function getMigrationIssues(filters: MigrationFilters = {}): Promise<MigrationIssue[]> {
  let q = db.from(T.issue).select('*').order('raised_at', { ascending: false });
  if (filters.status) q = q.eq('issue_status', filters.status);
  if (filters.planId) q = q.eq('migration_plan_id', filters.planId);
  if (filters.search) {
    const s = `%${filters.search}%`;
    q = q.or(`issue_code.ilike.${s},issue_title.ilike.${s}`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MigrationIssue[];
}
export async function getMigrationIssue(id: string) {
  const { data, error } = await db.from(T.issue).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as MigrationIssue | null;
}
export async function createMigrationIssue(payload: MigrationIssueFormValues) {
  const { data, error } = await db.from(T.issue).insert(payload).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.issue.created, 'CREATE', 'mig_migration_issue', data.id, { after_value: data });
  return data as MigrationIssue;
}
export async function updateMigrationIssue(id: string, payload: MigrationIssueFormValues) {
  const { data, error } = await db.from(T.issue).update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.issue.updated, 'UPDATE', 'mig_migration_issue', id, { after_value: data });
  return data as MigrationIssue;
}
export async function assignMigrationIssue(id: string, userId: string) {
  return updateMigrationIssue(id, { assigned_to_user_id: userId });
}
export async function resolveMigrationIssue(id: string, resolutionNotes: string) {
  const { data, error } = await db.from(T.issue).update({
    issue_status: 'RESOLVED', resolution_notes: resolutionNotes, resolved_at: new Date().toISOString(),
  }).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.issue.resolved, 'UPDATE', 'mig_migration_issue', id, { notes: resolutionNotes });
  return data as MigrationIssue;
}
export async function waiveMigrationIssue(id: string, reason: string) {
  const { data, error } = await db.from(T.issue).update({ issue_status: 'WAIVED', resolution_notes: reason }).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.issue.waived, 'APPROVE', 'mig_migration_issue', id, { reason, risk_level: 'HIGH', is_sensitive: true });
  return data as MigrationIssue;
}
export async function reopenMigrationIssue(id: string) {
  return updateMigrationIssue(id, { issue_status: 'REOPENED' });
}

// ---------------- Cutover readiness ----------------
export async function getCutoverReadinessChecks(): Promise<CutoverReadinessCheck[]> {
  const { data, error } = await db.from(T.cutCheck).select('*').order('display_order');
  if (error) throw error;
  return (data ?? []) as CutoverReadinessCheck[];
}
export async function createCutoverReadinessCheck(payload: Partial<CutoverReadinessCheck>) {
  const { data, error } = await db.from(T.cutCheck).insert(payload).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.cutover.checkCreated, 'CREATE', 'mig_cutover_readiness_check', data.id, { after_value: data });
  return data as CutoverReadinessCheck;
}
export async function updateCutoverReadinessCheck(id: string, payload: Partial<CutoverReadinessCheck>) {
  const { data, error } = await db.from(T.cutCheck).update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data as CutoverReadinessCheck;
}
export async function deactivateCutoverReadinessCheck(id: string) {
  await db.from(T.cutCheck).update({ is_active: false }).eq('id', id);
}
export async function reactivateCutoverReadinessCheck(id: string) {
  await db.from(T.cutCheck).update({ is_active: true }).eq('id', id);
}
export async function getCutoverReadinessResults(planId?: string, batchId?: string): Promise<CutoverReadinessResult[]> {
  let q = db.from(T.cutResult).select('*').order('created_at', { ascending: false });
  if (planId) q = q.eq('migration_plan_id', planId);
  if (batchId) q = q.eq('migration_batch_id', batchId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as CutoverReadinessResult[];
}
export async function updateCutoverReadinessResult(id: string, payload: CutoverReadinessFormValues) {
  const { data, error } = await db.from(T.cutResult).update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  await audit(MIGRATION_EVENTS.cutover.resultUpdated, 'UPDATE', 'mig_cutover_readiness_result', id, { after_value: data });
  return data as CutoverReadinessResult;
}
export async function approveCutoverReadiness(planId?: string, batchId?: string) {
  const now = new Date().toISOString();
  let q = db.from(T.cutResult).update({ approved_at: now });
  if (planId) q = q.eq('migration_plan_id', planId);
  if (batchId) q = q.eq('migration_batch_id', batchId);
  const { error } = await q;
  if (error) throw error;
  await audit(MIGRATION_EVENTS.cutover.approved, 'APPROVE', 'mig_cutover_readiness_result', planId ?? batchId ?? null, {
    risk_level: 'CRITICAL', is_sensitive: true, metadata: { planId, batchId },
  });
}

// ---------------- Dashboard / readiness ----------------
export async function getMigrationDashboardMetrics(_filters: MigrationFilters = {}): Promise<MigrationDashboardMetrics> {
  const [plans, planTables, issues, validations, recons, batches] = await Promise.all([
    db.from(T.plan).select('id, plan_status'),
    db.from(T.planTable).select('id, readiness_status, mapping_completeness_percent, validation_pass_percent, blocking_issue_count'),
    db.from(T.issue).select('id, issue_status, is_cutover_blocker'),
    db.from(T.vResult).select('id, validation_status'),
    db.from(T.recon).select('id, reconciliation_status'),
    db.from(T.batch).select('id, batch_status, updated_at').order('updated_at', { ascending: false }).limit(1),
  ]);

  const pts = (planTables.data ?? []) as any[];
  const iss = (issues.data ?? []) as any[];
  const vals = (validations.data ?? []) as any[];
  const rec = (recons.data ?? []) as any[];

  const readyTables = pts.filter((p) => ['READY_FOR_PROD', 'READY_FOR_TEST', 'COMPLETED'].includes(p.readiness_status)).length;
  const mappingGaps = pts.filter((p) => (p.mapping_completeness_percent ?? 0) < 100).length;
  const openIssues = iss.filter((i) => !['RESOLVED', 'CLOSED', 'WAIVED'].includes(i.issue_status)).length;
  const cutoverBlockers = iss.filter((i) => i.is_cutover_blocker && !['RESOLVED', 'CLOSED', 'WAIVED'].includes(i.issue_status)).length;
  const validationFailures = vals.filter((v) => v.validation_status === 'FAILED' || v.validation_status === 'ERROR').length;
  const reconDiffs = rec.filter((r) => ['MISMATCHED', 'PARTIAL', 'FAILED'].includes(r.reconciliation_status)).length;

  const mappingCompleteness = pts.length ? Math.round(pts.reduce((s, p) => s + (p.mapping_completeness_percent ?? 0), 0) / pts.length) : 0;
  const validationPassRate = vals.length ? Math.round((vals.filter((v) => v.validation_status === 'PASSED').length / vals.length) * 100) : 0;
  const reconMatchedRate = rec.length ? Math.round((rec.filter((r) => r.reconciliation_status === 'MATCHED' || r.reconciliation_status === 'ACCEPTED_WITH_DIFFERENCE').length / rec.length) * 100) : 0;
  const overall = Math.round((mappingCompleteness + validationPassRate + reconMatchedRate + (cutoverBlockers === 0 ? 100 : 0)) / 4);

  return {
    plans: (plans.data ?? []).length,
    tablesReady: readyTables,
    mappingGaps,
    openIssues,
    cutoverBlockers,
    validationFailures,
    reconciliationDifferences: reconDiffs,
    lastBatchStatus: (batches.data ?? [])[0]?.batch_status ?? null,
    overallReadinessPercent: overall,
    mappingCompletenessPercent: mappingCompleteness,
    validationPassRate,
    reconciliationMatchedRate: reconMatchedRate,
  };
}

export async function getMigrationReadinessSummary(planId?: string): Promise<MigrationReadinessSummary> {
  let planName: string | null = null;
  if (planId) {
    const { data } = await db.from(T.plan).select('plan_name').eq('id', planId).maybeSingle();
    planName = data?.plan_name ?? null;
  }
  let ptQ = db.from(T.planTable).select('*');
  if (planId) ptQ = ptQ.eq('migration_plan_id', planId);
  const { data: pts } = await ptQ;
  const arr = (pts ?? []) as any[];
  const readyTables = arr.filter((p) => ['READY_FOR_PROD', 'COMPLETED'].includes(p.readiness_status)).length;
  const blockedTables = arr.filter((p) => p.readiness_status === 'BLOCKED').length;
  const incompleteMapping = arr.filter((p) => (p.mapping_completeness_percent ?? 0) < 100).length;
  const openBlockers = arr.reduce((s, p) => s + (p.blocking_issue_count ?? 0), 0);
  const cutResults = await getCutoverReadinessResults(planId);
  const passed = cutResults.filter((r) => r.check_status === 'PASSED').length;
  const cutoverReadinessPercent = cutResults.length ? Math.round((passed / cutResults.length) * 100) : 0;
  return {
    planId: planId ?? null,
    planName,
    totalTables: arr.length,
    readyTables,
    blockedTables,
    incompleteMapping,
    openBlockers,
    cutoverReadinessPercent,
  };
}

export async function getMigrationBlockingIssues(planId?: string): Promise<MigrationIssue[]> {
  let q = db.from(T.issue).select('*').eq('is_cutover_blocker', true).not('issue_status', 'in', '(RESOLVED,CLOSED,WAIVED)');
  if (planId) q = q.eq('migration_plan_id', planId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MigrationIssue[];
}

export async function getCutoverReadinessSummary(planId?: string, batchId?: string) {
  const results = await getCutoverReadinessResults(planId, batchId);
  const total = results.length;
  const passed = results.filter((r) => r.check_status === 'PASSED').length;
  const failed = results.filter((r) => r.check_status === 'FAILED').length;
  const notAssessed = results.filter((r) => r.check_status === 'NOT_ASSESSED').length;
  return {
    total,
    passed,
    failed,
    notAssessed,
    percent: total ? Math.round((passed / total) * 100) : 0,
  };
}

export const coreMigrationService = {
  // dashboard
  getMigrationDashboardMetrics, getMigrationReadinessSummary, getMigrationBlockingIssues, getCutoverReadinessSummary,
  // pb
  getPowerBuilderObjects, getPowerBuilderObject, createPowerBuilderObject, updatePowerBuilderObject,
  reviewPowerBuilderObject, deactivatePowerBuilderObject, reactivatePowerBuilderObject,
  // plans
  getMigrationPlans, getMigrationPlan, createMigrationPlan, updateMigrationPlan,
  submitMigrationPlan, approveMigrationPlan, rejectMigrationPlan, cancelMigrationPlan,
  // plan tables
  getMigrationPlanTables, addMigrationPlanTable, updateMigrationPlanTable, removeMigrationPlanTable,
  calculateMappingCompleteness, calculateTableReadiness,
  // batches
  getMigrationBatches, getMigrationBatch, createMigrationBatch, updateMigrationBatch,
  submitMigrationBatch, approveMigrationBatch, startMigrationBatch, completeMigrationBatch, failMigrationBatch,
  // runs
  getMigrationRuns, createMigrationRun, startMigrationRun, completeMigrationRun, failMigrationRun,
  getMigrationTableRuns, createMigrationTableRun, updateMigrationTableRun,
  // validation
  getValidationRules, createValidationRule, updateValidationRule, deactivateValidationRule, reactivateValidationRule,
  getValidationResults, recordValidationResult, waiveValidationResult,
  // reconciliation
  getReconciliationSummaries, recordReconciliationSummary, acceptReconciliationDifference,
  // issues
  getMigrationIssues, getMigrationIssue, createMigrationIssue, updateMigrationIssue,
  assignMigrationIssue, resolveMigrationIssue, waiveMigrationIssue, reopenMigrationIssue,
  // cutover
  getCutoverReadinessChecks, createCutoverReadinessCheck, updateCutoverReadinessCheck,
  deactivateCutoverReadinessCheck, reactivateCutoverReadinessCheck,
  getCutoverReadinessResults, updateCutoverReadinessResult, approveCutoverReadiness,
};
