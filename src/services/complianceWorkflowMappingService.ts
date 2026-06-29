/**
 * Compliance Workflow Mapping Service
 *
 * Bridges Compliance event keys to the central `workflow_definitions` engine.
 * Never duplicates the workflow engine — only resolves which definition (if any)
 * applies to a given compliance event/context, and exposes CRUD for the
 * Administration > Workflow Mapping screen.
 */
import { supabase } from '@/integrations/supabase/client';

export const COMPLIANCE_EVENT_KEYS = [
  // Approval-gate events (existing)
  'violation.verify',
  'violation.manual_create',
  'case.create_approval',
  'notice.approval',
  'arrangement.approval',
  'waiver.approval',
  'legal.escalation_approval',
  'case.closure_approval',
  'case.reopen_approval',
  'case.merge_approval',
  'inspection.plan_approval',
  'inspection.finding_approval',
  'rule.activation_approval',
  // In-progress status-transition events (Phase 1: violations).
  // Each one resolves to the same Workflow Mapping screen; admins can either
  // leave it as DIRECT_APPLY (validated by ce_apply_status_transition) or
  // map it to a workflow_definition to require approvals.
  'violation.status.START_WORK',
  'violation.status.MOVE_TO_REVIEW',
  'violation.status.ESCALATE',
  'violation.status.RESOLVE',
  'violation.status.CANCEL',
  'violation.status.REOPEN',
  'violation.status.CLOSE',
] as const;

export type ComplianceEventKey = typeof COMPLIANCE_EVENT_KEYS[number];

export type FallbackBehavior = 'DIRECT_APPLY' | 'BLOCK' | 'REQUIRE_NOTE';

export interface WorkflowMapping {
  id: string;
  event_key: string;
  enabled: boolean;
  workflow_definition_id: string | null;
  fallback_behavior: FallbackBehavior;
  applicable_fund: string | null;
  applicable_severity: string | null;
  applicable_min_amount: number | null;
  applicable_violation_type_id: string | null;
  priority: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  workflow_name?: string | null;
}

export interface ResolveContext {
  fund?: string | null;
  severity?: string | null;
  amount?: number | null;
  violationTypeId?: string | null;
}

export interface ResolvedMapping {
  enabled: boolean;
  workflowDefinitionId: string | null;
  workflowName: string | null;
  fallbackBehavior: FallbackBehavior;
  mappingId: string | null;
}

const TABLE = 'ce_workflow_mappings' as never;

export async function listMappings(): Promise<WorkflowMapping[]> {
  const { data, error } = await (supabase.from(TABLE) as any)
    .select('*, workflow_definitions(name)')
    .order('event_key', { ascending: true })
    .order('priority', { ascending: true });
  if (error) throw error;
  return (data || []).map((r: any) => ({ ...r, workflow_name: r.workflow_definitions?.name ?? null }));
}

export async function upsertMapping(m: Partial<WorkflowMapping> & { event_key: string }, userCode: string): Promise<void> {
  const payload = {
    event_key: m.event_key,
    enabled: !!m.enabled,
    workflow_definition_id: m.workflow_definition_id || null,
    fallback_behavior: m.fallback_behavior || 'DIRECT_APPLY',
    applicable_fund: m.applicable_fund || null,
    applicable_severity: m.applicable_severity || null,
    applicable_min_amount: m.applicable_min_amount ?? null,
    applicable_violation_type_id: m.applicable_violation_type_id || null,
    priority: m.priority ?? 100,
    notes: m.notes || null,
    updated_by: userCode,
    updated_at: new Date().toISOString(),
  };
  if (m.id) {
    const { error } = await (supabase.from(TABLE) as any).update(payload).eq('id', m.id);
    if (error) throw error;
  } else {
    const { error } = await (supabase.from(TABLE) as any).insert({ ...payload, created_by: userCode });
    if (error) throw error;
  }
}

export async function deleteMapping(id: string): Promise<void> {
  const { error } = await (supabase.from(TABLE) as any).delete().eq('id', id);
  if (error) throw error;
}

/**
 * Resolve the mapping for an event. Picks the best-fitting (most specific) enabled row,
 * else falls back to the generic event row, else returns DIRECT_APPLY.
 */
export async function resolveWorkflow(
  eventKey: ComplianceEventKey,
  ctx: ResolveContext = {}
): Promise<ResolvedMapping> {
  const { data, error } = await (supabase.from(TABLE) as any)
    .select('*, workflow_definitions(name, is_active)')
    .eq('event_key', eventKey)
    .order('priority', { ascending: true });
  if (error) throw error;
  const rows: any[] = data || [];
  const matches = rows.filter((r) => {
    if (r.applicable_fund && ctx.fund && r.applicable_fund !== ctx.fund) return false;
    if (r.applicable_severity && ctx.severity && r.applicable_severity !== ctx.severity) return false;
    if (r.applicable_violation_type_id && ctx.violationTypeId &&
        r.applicable_violation_type_id !== ctx.violationTypeId) return false;
    if (r.applicable_min_amount != null && ctx.amount != null &&
        Number(ctx.amount) < Number(r.applicable_min_amount)) return false;
    return true;
  });
  // prefer the most specific enabled row
  const specificityScore = (r: any) =>
    (r.applicable_fund ? 1 : 0) + (r.applicable_severity ? 1 : 0) +
    (r.applicable_violation_type_id ? 1 : 0) + (r.applicable_min_amount != null ? 1 : 0);
  const enabledMatch = [...matches]
    .filter((r) => r.enabled && r.workflow_definition_id && r.workflow_definitions?.is_active !== false)
    .sort((a, b) => specificityScore(b) - specificityScore(a) || a.priority - b.priority)[0];
  if (enabledMatch) {
    return {
      enabled: true,
      workflowDefinitionId: enabledMatch.workflow_definition_id,
      workflowName: enabledMatch.workflow_definitions?.name ?? null,
      fallbackBehavior: enabledMatch.fallback_behavior,
      mappingId: enabledMatch.id,
    };
  }
  // not enabled — use the most specific disabled row for fallback hint
  const fb = matches.sort((a, b) => specificityScore(b) - specificityScore(a))[0];
  return {
    enabled: false,
    workflowDefinitionId: null,
    workflowName: null,
    fallbackBehavior: (fb?.fallback_behavior as FallbackBehavior) || 'DIRECT_APPLY',
    mappingId: fb?.id || null,
  };
}
