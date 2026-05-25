/**
 * Compliance & Enforcement audit service.
 *
 * Single writer/reader for the existing `ce_audit_log` table. Every
 * Compliance state change (status flip, approval, notice issuance, payment,
 * waiver, escalation, automation run, etc.) flows through `logAudit` so the
 * timeline UI has a unified, queryable source.
 *
 * Conventions preserved:
 *  - `performed_by` stores the current profile `user_code` (per project memory).
 *  - `old_values` / `new_values` are JSONB diffs (free-form per entity_type).
 *  - `description` is the short human-readable line shown in the timeline.
 *  - `reason` is the operator-supplied justification (waiver reason, reject
 *    reason, etc.) — separate from `description` so it's filterable.
 *  - `workflow_task_id` links the entry to the workflow task that drove the
 *    change, when applicable.
 *
 * Failures are logged but never thrown — audit is fire-and-forget so a logging
 * outage cannot block a business action (per project shielded-error standard).
 */
import { supabase } from '@/integrations/supabase/client';

export type ComplianceAuditEntityType =
  | 'violation'
  | 'case'
  | 'notice'
  | 'employer_response'
  | 'payment_arrangement'
  | 'installment'
  | 'breach'
  | 'waiver'
  | 'inspection'
  | 'legal_escalation'
  | 'rule'
  | 'automation_job'
  | 'feature_toggle';

export interface ComplianceAuditEntry {
  id: string;
  entity_type: ComplianceAuditEntityType | string;
  entity_id: string;
  action: string;
  description: string | null;
  reason: string | null;
  old_values: unknown;
  new_values: unknown;
  performed_by: string | null;
  performed_at: string;
  workflow_task_id: string | null;
}

export interface LogAuditInput {
  entityType: ComplianceAuditEntityType;
  entityId: string;
  action: string;
  description?: string;
  reason?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  workflowTaskId?: string | null;
  /** Override the current user_code (rare — e.g. system jobs writing on behalf of a user). */
  performedBy?: string;
}

async function resolveUserCode(explicit?: string): Promise<string | null> {
  if (explicit) return explicit;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return null;
    const { data } = await supabase
      .from('profiles')
      .select('user_code')
      .eq('id', user.id)
      .maybeSingle();
    return data?.user_code ?? null;
  } catch {
    return null;
  }
}

/**
 * Fire-and-forget audit write. Never throws.
 * Returns the inserted row id on success, null on failure.
 */
export async function logAudit(input: LogAuditInput): Promise<string | null> {
  try {
    const performed_by = await resolveUserCode(input.performedBy);
    const { data, error } = await supabase
      .from('ce_audit_log')
      .insert([{
        entity_type: input.entityType,
        entity_id: input.entityId,
        action: input.action,
        description: input.description ?? null,
        reason: input.reason ?? null,
        old_values: (input.oldValues ?? null) as never,
        new_values: (input.newValues ?? null) as never,
        workflow_task_id: input.workflowTaskId ?? null,
        performed_by,
      }])
      .select('id')
      .single();

    if (error) {
      console.warn('[complianceAuditService] insert failed', error.message);
      return null;
    }
    return data.id;
  } catch (err) {
    console.warn('[complianceAuditService] insert threw', err);
    return null;
  }
}

/**
 * List timeline entries for one object. Newest first. Capped to 200 to stay
 * within the project's interactive-list standard.
 */
export async function listAuditEntries(
  entityType: ComplianceAuditEntityType,
  entityId: string,
  limit = 200,
): Promise<ComplianceAuditEntry[]> {
  if (!entityId) return [];
  const { data, error } = await supabase
    .from('ce_audit_log')
    .select('id, entity_type, entity_id, action, description, reason, old_values, new_values, performed_by, performed_at, workflow_task_id')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('performed_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('[complianceAuditService] list failed', error.message);
    return [];
  }
  return (data ?? []) as ComplianceAuditEntry[];
}

/**
 * Aggregate timeline for a case: includes audit rows targeting the case itself
 * plus its child violations / notices / arrangements / installments / breaches
 * / waivers / legal escalations. Caller supplies the related ids — this keeps
 * the function side-effect-free and easy to memo.
 */
export interface AggregateAuditInput {
  caseId?: string;
  violationIds?: string[];
  noticeIds?: string[];
  arrangementIds?: string[];
  installmentIds?: string[];
  breachIds?: string[];
  waiverIds?: string[];
  escalationIds?: string[];
  inspectionIds?: string[];
}

export async function listAggregateAudit(input: AggregateAuditInput, limit = 300): Promise<ComplianceAuditEntry[]> {
  const filters: Array<{ entity_type: ComplianceAuditEntityType; ids: string[] }> = [
    { entity_type: 'case', ids: input.caseId ? [input.caseId] : [] },
    { entity_type: 'violation', ids: input.violationIds ?? [] },
    { entity_type: 'notice', ids: input.noticeIds ?? [] },
    { entity_type: 'payment_arrangement', ids: input.arrangementIds ?? [] },
    { entity_type: 'installment', ids: input.installmentIds ?? [] },
    { entity_type: 'breach', ids: input.breachIds ?? [] },
    { entity_type: 'waiver', ids: input.waiverIds ?? [] },
    { entity_type: 'legal_escalation', ids: input.escalationIds ?? [] },
    { entity_type: 'inspection', ids: input.inspectionIds ?? [] },
  ].filter((f) => f.ids.length > 0);

  if (filters.length === 0) return [];

  const queries = filters.map((f) =>
    supabase
      .from('ce_audit_log')
      .select('id, entity_type, entity_id, action, description, reason, old_values, new_values, performed_by, performed_at, workflow_task_id')
      .eq('entity_type', f.entity_type)
      .in('entity_id', f.ids)
      .order('performed_at', { ascending: false })
      .limit(limit),
  );
  const results = await Promise.all(queries);
  const merged = results.flatMap((r) => (r.data ?? []) as ComplianceAuditEntry[]);
  merged.sort((a, b) => (a.performed_at < b.performed_at ? 1 : -1));
  return merged.slice(0, limit);
}
