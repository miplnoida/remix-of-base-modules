/**
 * BN Workflow Integration Service
 *
 * Bridges the Benefits module's domain-specific claim lifecycle with the
 * enterprise workflow engine (workflow_definitions, workflow_instances,
 * workflow_tasks, workflow_step_actions, workflow_logs).
 *
 * Design philosophy: WRAP, don't replace.
 *   - The generic engine owns instance/task/action execution.
 *   - This service maps BN domain transitions to engine primitives.
 *   - bn_claim_transition_rule remains the authoritative transition matrix.
 *   - CLAIM_TRANSITIONS (claimWorkbenchService) provides the in-app
 *     fallback when no workflow_definition is configured for a module.
 *
 * Existing tables used:
 *   workflow_definitions, workflow_instances, workflow_tasks,
 *   workflow_steps, workflow_step_actions, workflow_triggers,
 *   workflow_logs, app_modules, roles, profiles
 *
 * BN tables consumed:
 *   bn_claim, bn_claim_event, bn_claim_transition_rule,
 *   bn_entitlement, bn_payment_instruction, bn_payment_batch,
 *   bn_post_issue_task
 */

import { supabase } from '@/integrations/supabase/client';
import { resolveReportingManagerForTask } from '@/services/resolveReportingManager';

const db = supabase as any;

// ─── Module Registry ────────────────────────────────────────────────
// Maps BN sub-modules to workflow source_module identifiers.
// If a workflow_definition is configured for a source_module,
// the generic engine governs; otherwise BN's own transition matrix applies.

export const BN_WORKFLOW_MODULES = {
  CLAIM:            'bn_claim',
  DETERMINATION:    'bn_determination',
  APPROVAL:         'bn_approval',
  ENTITLEMENT:      'bn_entitlement',
  PAYABLE:          'bn_payable',
  SCHEDULE:         'bn_schedule',
  BATCH:            'bn_batch',
  ISSUE:            'bn_issue',
  POST_ISSUE:       'bn_post_issue',
} as const;

export type BnWorkflowModule = typeof BN_WORKFLOW_MODULES[keyof typeof BN_WORKFLOW_MODULES];

// ─── Status ↔ Workflow State Mapping ────────────────────────────────
// Generic workflow end-states (Approved/Rejected) map to BN-specific status codes.

export const WORKFLOW_END_STATE_MAP: Record<string, Record<string, string>> = {
  bn_claim: {
    Approved: 'APPROVED',
    Rejected: 'DENIED',
  },
  bn_approval: {
    Approved: 'APPROVED',
    Rejected: 'DISALLOWED',
  },
  bn_batch: {
    Approved: 'APPROVED',
    Rejected: 'CANCELLED',
  },
  bn_entitlement: {
    Approved: 'ACTIVE',
    Rejected: 'CANCELLED',
  },
};

// ─── Workflow Trigger Helper ────────────────────────────────────────
// Reuses the same pattern as triggerIPRegistrationWorkflow but
// parameterized for any BN sub-module.

export interface BnTriggerWorkflowParams {
  sourceModule: BnWorkflowModule;
  entityId: string;
  entityName: string;
  ssn?: string;
  userId: string;
  metadata?: Record<string, any>;
}

export async function triggerBnWorkflow(params: BnTriggerWorkflowParams): Promise<string | null> {
  const { sourceModule, entityId, entityName, ssn, userId, metadata } = params;

  try {
    // 1. Duplicate check
    const { data: existing } = await db
      .from('workflow_instances')
      .select('id')
      .eq('source_module', sourceModule)
      .eq('source_record_id', entityId)
      .not('status', 'in', '("Completed","Rejected","Cancelled")')
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`[bnWorkflow] Instance already exists for ${sourceModule}/${entityId}`);
      return existing[0].id;
    }

    // 2. Find trigger
    const { data: triggers } = await db
      .from('workflow_triggers')
      .select('id, workflow_id, action_name, is_active')
      .eq('action_name', 'submit')
      .eq('is_active', true)
      .eq('source_module', sourceModule);

    // If no trigger configured, BN's own transition matrix handles it
    if (!triggers || triggers.length === 0) {
      console.log(`[bnWorkflow] No workflow trigger for ${sourceModule} — using BN transitions`);
      return null;
    }

    const trigger = triggers[0];

    // 3. Workflow definition
    const { data: workflow } = await db
      .from('workflow_definitions')
      .select('id, name, default_sla_hours, maker_checker_enabled')
      .eq('id', trigger.workflow_id)
      .eq('is_active', true)
      .single();

    if (!workflow) return null;

    // 4. Steps
    const { data: steps } = await db
      .from('workflow_steps')
      .select('id, step_name, step_number, sla_hours, approver_type, approver_role_ids, approver_designation_ids, approver_user_ids')
      .eq('workflow_id', workflow.id)
      .order('step_number', { ascending: true });

    if (!steps || steps.length === 0) return null;

    // 5. Profile
    const { data: profile } = await db
      .from('profiles')
      .select('full_name, user_code')
      .eq('id', userId)
      .single();

    const firstStep = steps[0];
    const dueAt = new Date();
    dueAt.setHours(dueAt.getHours() + (workflow.default_sla_hours || 24));

    // 6. Create instance
    const { data: instance, error: instErr } = await db
      .from('workflow_instances')
      .insert({
        workflow_id: workflow.id,
        workflow_name: workflow.name,
        source_module: sourceModule,
        source_record_id: entityId,
        source_record_name: entityName,
        current_step_id: firstStep.id,
        status: 'InProgress',
        started_by: userId,
        started_by_name: profile?.full_name || 'System',
        due_at: dueAt.toISOString(),
        metadata: { ssn, ...metadata },
      })
      .select('id')
      .single();

    if (instErr || !instance) {
      console.error('[bnWorkflow] Instance creation failed:', instErr);
      return null;
    }

    // 7. Create first task
    const taskDueAt = new Date();
    taskDueAt.setHours(taskDueAt.getHours() + (firstStep.sla_hours || 24));

    const assignment = await resolveStepAssignment(firstStep, userId, instance.id);

    const { data: taskData } = await db
      .from('workflow_tasks')
      .insert({
        instance_id: instance.id,
        step_id: firstStep.id,
        step_name: firstStep.step_name,
        assigned_role: assignment.assigned_role || null,
        assigned_designation: assignment.assigned_designation || null,
        assigned_to: assignment.assigned_to || null,
        status: 'Pending',
        due_at: taskDueAt.toISOString(),
      })
      .select('id')
      .single();

    // 8. Log
    await db.from('workflow_logs').insert({
      instance_id: instance.id,
      step_id: firstStep.id,
      step_name: firstStep.step_name,
      action: 'workflow_started',
      performed_by: userId,
      performed_by_name: profile?.full_name || 'System',
      details: `BN workflow started: ${sourceModule} — ${entityName}`,
    });

    // 9. Notify via configurable notification engine (step_entry trigger)
    if (taskData?.id) {
      supabase.functions.invoke('workflow-process-notifications', {
        body: {
          instance_id: instance.id,
          step_id: firstStep.id,
          trigger: 'step_entry',
        },
      }).catch(err => console.warn('[bnWorkflow] Step notification failed (non-critical):', err));
    }

    // 10. Log BN audit event
    await logBnWorkflowEvent({
      entityId,
      sourceModule,
      action: 'WORKFLOW_TRIGGERED',
      performedBy: profile?.user_code || userId,
      narrative: `Workflow "${workflow.name}" triggered — instance ${instance.id}`,
      workflowInstanceId: instance.id,
    });

    return instance.id;
  } catch (err) {
    console.error('[bnWorkflow] triggerBnWorkflow error:', err);
    return null;
  }
}

// ─── Step Assignment Resolver ───────────────────────────────────────

async function resolveStepAssignment(
  step: any,
  initiatorUserId: string,
  instanceId: string
): Promise<{ assigned_role?: string; assigned_designation?: string; assigned_to?: string }> {
  const approverType = step.approver_type || 'role';

  if (approverType === 'role' && step.approver_role_ids?.length) {
    if (step.approver_role_ids.length === 1) {
      const { data: roleData } = await db
        .from('roles')
        .select('role_name')
        .eq('id', step.approver_role_ids[0])
        .single();
      return { assigned_role: roleData?.role_name || null };
    }
    return {};
  }

  if (approverType === 'designation' && step.approver_designation_ids?.length) {
    return { assigned_designation: step.approver_designation_ids[0] };
  }

  if ((approverType === 'user' || approverType === 'specific_users') && step.approver_user_ids?.length) {
    return { assigned_to: step.approver_user_ids[0] };
  }

  if (approverType === 'reporting_manager') {
    const resolved = await resolveReportingManagerForTask(initiatorUserId, instanceId, step.id, step.step_name);
    if (resolved) return { assigned_to: resolved.managerId };
  }

  return {};
}

// ─── BN → Generic Workflow Status Sync ──────────────────────────────
// When the generic engine completes (end_state = Approved/Rejected),
// this maps back to BN domain status and updates bn_claim / bn_entitlement / etc.

export async function syncWorkflowEndState(
  sourceModule: BnWorkflowModule,
  entityId: string,
  endState: 'Approved' | 'Rejected',
  userId: string
) {
  const statusMap = WORKFLOW_END_STATE_MAP[sourceModule];
  if (!statusMap) return;

  const bnStatus = statusMap[endState];
  if (!bnStatus) return;

  // Determine target table
  const tableMap: Record<string, string> = {
    bn_claim: 'bn_claim',
    bn_approval: 'bn_claim',
    bn_entitlement: 'bn_entitlement',
    bn_batch: 'bn_payment_batch',
  };

  const table = tableMap[sourceModule];
  if (!table) return;

  await db
    .from(table)
    .update({ status: bnStatus, modified_at: new Date().toISOString() })
    .eq('id', entityId);

  await logBnWorkflowEvent({
    entityId,
    sourceModule,
    action: `WORKFLOW_${endState.toUpperCase()}`,
    performedBy: userId,
    narrative: `Workflow end-state "${endState}" mapped to BN status "${bnStatus}"`,
  });
}

// ─── Dual-Mode Transition Executor ──────────────────────────────────
// Checks whether a generic workflow governs this entity.
// If yes → delegates to generic engine via useWorkflowActions/useExecuteWorkflowAction.
// If no  → falls through to BN's own CLAIM_TRANSITIONS logic.

export async function checkWorkflowGovernance(
  sourceModule: BnWorkflowModule,
  entityId: string
): Promise<{
  governed: boolean;
  instanceId: string | null;
  workflowName: string | null;
}> {
  const { data } = await db
    .from('workflow_instances')
    .select('id, workflow_name')
    .eq('source_module', sourceModule)
    .eq('source_record_id', entityId)
    .not('status', 'in', '("Completed","Rejected","Cancelled")')
    .order('started_at', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    return { governed: true, instanceId: data[0].id, workflowName: data[0].workflow_name };
  }
  return { governed: false, instanceId: null, workflowName: null };
}

// ─── BN Audit Event Logger ─────────────────────────────────────────
// Writes workflow-related events to bn_claim_event for domain traceability.

interface BnWorkflowEventParams {
  entityId: string;
  sourceModule: BnWorkflowModule;
  action: string;
  performedBy: string;
  narrative?: string;
  workflowInstanceId?: string;
  reasonCode?: string;
}

export async function logBnWorkflowEvent(params: BnWorkflowEventParams) {
  await db.from('bn_claim_event').insert({
    claim_id: params.entityId,
    event_type: 'WORKFLOW',
    action: params.action,
    performed_by: params.performedBy,
    performed_at: new Date().toISOString(),
    narrative: params.narrative || null,
    entity_type: params.sourceModule.toUpperCase(),
    metadata: {
      workflow_instance_id: params.workflowInstanceId || null,
      reason_code: params.reasonCode || null,
    },
  });
}

// ─── Escalation Check ───────────────────────────────────────────────
// Finds overdue workflow tasks for BN modules and flags them.

export async function checkBnEscalations(): Promise<Array<{
  taskId: string;
  instanceId: string;
  sourceModule: string;
  entityId: string;
  stepName: string;
  dueAt: string;
  hoursOverdue: number;
}>> {
  const now = new Date().toISOString();

  const { data: overdueTasks } = await db
    .from('workflow_tasks')
    .select('id, instance_id, step_name, due_at, workflow_instance:workflow_instances(source_module, source_record_id)')
    .in('status', ['Pending', 'InProgress'])
    .lt('due_at', now)
    .limit(200);

  if (!overdueTasks) return [];

  return overdueTasks
    .filter((t: any) => {
      const mod = t.workflow_instance?.source_module || '';
      return mod.startsWith('bn_');
    })
    .map((t: any) => ({
      taskId: t.id,
      instanceId: t.instance_id,
      sourceModule: t.workflow_instance?.source_module || '',
      entityId: t.workflow_instance?.source_record_id || '',
      stepName: t.step_name || '',
      dueAt: t.due_at,
      hoursOverdue: Math.round((Date.now() - new Date(t.due_at).getTime()) / 3600000),
    }));
}

// ─── Exception Routing ──────────────────────────────────────────────
// When a BN operation fails (e.g., batch issue failure, post-issue task failure),
// creates a workflow task for supervisor review if a workflow is governing.

export async function routeBnException(params: {
  sourceModule: BnWorkflowModule;
  entityId: string;
  exceptionType: string;
  description: string;
  userId: string;
}) {
  const governance = await checkWorkflowGovernance(params.sourceModule, params.entityId);

  // Always log to bn_claim_event regardless of governance
  await logBnWorkflowEvent({
    entityId: params.entityId,
    sourceModule: params.sourceModule,
    action: `EXCEPTION_${params.exceptionType}`,
    performedBy: params.userId,
    narrative: params.description,
  });

  // If governed, log exception in workflow_logs as well
  if (governance.governed && governance.instanceId) {
    await db.from('workflow_logs').insert({
      instance_id: governance.instanceId,
      action: 'exception_raised',
      performed_by: params.userId,
      details: `${params.exceptionType}: ${params.description}`,
    });
  }

  // Create bn_payment_exception for financial exceptions
  if (['ISSUE_FAILED', 'DUPLICATE_PAYMENT', 'VALIDATION_FAILED'].includes(params.exceptionType)) {
    await db.from('bn_payment_exception').insert({
      claim_id: params.entityId,
      exception_type: params.exceptionType,
      description: params.description,
      status: 'OPEN',
      raised_by: params.userId,
      raised_at: new Date().toISOString(),
    });
  }
}
