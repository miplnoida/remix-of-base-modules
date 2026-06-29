/**
 * Compliance Workflow Status Service
 *
 * Single chokepoint for in-progress status transitions on Compliance entities
 * (Violations, Cases, Notices, Arrangements, Legal Escalations, Inspections,
 * Breaches, Waivers).
 *
 * Delegates to the existing workflow engine:
 *   1. Resolves an `<entity>.status.<ACTION_CODE>` event key against
 *      ce_workflow_mappings (the same table that drives approval gates).
 *   2. If a mapping is enabled with a workflow definition, the caller should
 *      start a workflow_instance via the existing useExecuteWorkflowAction hook
 *      (we return WORKFLOW_REQUIRED with the workflow id).
 *   3. Otherwise the server-side RPC `ce_apply_status_transition` validates
 *      the (from_status, action_code) tuple against the seeded baseline
 *      workflow ("CE Status — Trivial Transitions") and atomically updates
 *      the entity row + entity history table + system_audit_trail.
 *
 * Never duplicates maker-checker, capability gating, or audit — those are
 * provided by the existing engine.
 */
import { supabase } from '@/integrations/supabase/client';

export type CeEntityType =
  | 'violation'
  | 'case'
  | 'notice'
  | 'inspection'
  | 'arrangement'
  | 'waiver'
  | 'legal_recommendation'
  | 'legal_referral';

export interface TransitionRequest {
  entityType: CeEntityType;
  recordId: string;
  actionCode: string;       // 'START_WORK' | 'RESOLVE' | …
  userCode: string;
  notes?: string;
}

export interface TransitionResult {
  success: boolean;
  mode?: 'APPLIED' | 'WORKFLOW_REQUIRED';
  fromStatus?: string;
  toStatus?: string;
  workflowDefinitionId?: string;
  error?: string;
}

export interface AvailableAction {
  actionCode: string;
  actionLabel: string;
  toStatus: string;
  displayOrder: number;
}

/**
 * Fetch the actions available for a given entity in its current status.
 * Reads from the `ce_allowed_status_transitions` view (driven by the
 * baseline workflow's workflow_steps + workflow_step_actions rows, which
 * admins can edit in the standard Workflow Designer).
 */
export async function listAllowedActions(
  entityType: CeEntityType,
  fromStatus: string
): Promise<AvailableAction[]> {
  const { data, error } = await (supabase.from('ce_allowed_status_transitions' as any) as any)
    .select('*')
    .eq('entity_type', entityType)
    .eq('from_status', fromStatus)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data || []).map((r: any) => ({
    actionCode: r.action_code,
    actionLabel: r.action_label,
    toStatus: r.to_status,
    displayOrder: r.display_order,
  }));
}

/**
 * Apply (or stage) a status transition. Routes through the existing
 * workflow engine when an admin has mapped a workflow to the event key;
 * otherwise applies it server-side via ce_apply_status_transition.
 */
export async function requestTransition(req: TransitionRequest): Promise<TransitionResult> {
  const { entityType, recordId, actionCode, userCode, notes } = req;
  const { data, error } = await (supabase.rpc as any)('ce_apply_status_transition', {
    p_entity_type: entityType,
    p_record_id: recordId,
    p_action_code: actionCode,
    p_user_code: userCode,
    p_notes: notes ?? null,
  });

  if (error) {
    return { success: false, error: error.message || 'Status transition failed' };
  }
  const payload = (data || {}) as any;
  if (payload.mode === 'WORKFLOW_REQUIRED') {
    // Caller should start a workflow_instance via useExecuteWorkflowAction.
    return {
      success: true,
      mode: 'WORKFLOW_REQUIRED',
      workflowDefinitionId: payload.workflow_definition_id,
    };
  }
  return {
    success: true,
    mode: 'APPLIED',
    fromStatus: payload.from_status,
    toStatus: payload.to_status,
  };
}

export const ceWorkflowStatusService = {
  listAllowedActions,
  requestTransition,
};
