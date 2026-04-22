/**
 * Shared Workflow Trigger Service
 *
 * Centralizes the logic for triggering workflow instances on IP Registration submissions.
 * Used by both manual submission (useIPRegistrationSubmit) and programmatic conversion
 * (useConvertToIPRegistration) to ensure consistency.
 */
import { supabase } from '@/integrations/supabase/client';
import { resolveReportingManagerForTask } from '@/services/resolveReportingManager';

interface WorkflowTrigger {
  id: string;
  workflow_id: string;
  action_name: string;
  is_active: boolean;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  default_sla_hours: number | null;
}

interface WorkflowStep {
  id: string;
  step_name: string;
  step_number: number;
  sla_hours: number | null;
  approver_type?: string | null;
  approver_role_ids?: string[] | null;
  approver_designation_ids?: string[] | null;
  approver_user_ids?: string[] | null;
}

export interface TriggerWorkflowParams {
  uniqueUuid: string;
  ssn: string;
  recordName: string;
  userId?: string;
  sourceModule?: string;
  moduleId?: string;
  /**
   * When true, allows creating a fresh workflow instance even if a CLOSED
   * (Completed/Approved/Rejected/Cancelled) instance already exists.
   * Active instances (Pending/InProgress/Escalated/Query/AwaitingMeeting)
   * always block re-initiation regardless of this flag.
   */
  allowReinitiate?: boolean;
}

export interface TriggerWorkflowResult {
  /** The workflow instance id — either newly created or the existing active one. */
  instanceId: string | null;
  /** True only when a NEW instance was inserted in this call. */
  created: boolean;
  /** Human-readable explanation when created=false or instanceId=null. */
  reason?: string;
  /** When an existing instance is returned, its current status. */
  existingStatus?: string | null;
}

const ACTIVE_STATUSES = new Set([
  'Pending',
  'InProgress',
  'Escalated',
  'Query',
  'AwaitingMeeting',
]);

const CLOSED_STATUSES = new Set([
  'Completed',
  'Approved',
  'Rejected',
  'Cancelled',
]);

/**
 * Triggers a workflow instance for an IP Registration record.
 * Returns a structured result so callers can distinguish a brand-new instance
 * from a reused/blocked one and surface the right toast.
 */
export async function triggerIPRegistrationWorkflow({
  uniqueUuid,
  ssn,
  recordName,
  userId,
  sourceModule = 'insured_person_registration',
  moduleId = '305eaff7-8446-47e0-a7ac-186da08b91ee',
  allowReinitiate = true,
}: TriggerWorkflowParams): Promise<TriggerWorkflowResult> {
  try {
    // 0. Resolve auth user if not provided — we MUST stamp started_by accurately.
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const { data: authData } = await supabase.auth.getUser();
      resolvedUserId = authData?.user?.id;
    }
    if (!resolvedUserId) {
      console.warn('[workflowTriggerService] No authenticated user; refusing to create workflow instance');
      return {
        instanceId: null,
        created: false,
        reason: 'Not authenticated. Please sign in and try again.',
      };
    }

    // 1. Status-aware duplicate check
    const { data: existing, error: existErr } = await supabase
      .from('workflow_instances')
      .select('id, status, created_at')
      .eq('source_module', sourceModule)
      .eq('source_record_id', uniqueUuid)
      .order('created_at', { ascending: false });

    if (existErr) {
      console.error('[workflowTriggerService] Failed to check existing instances:', existErr);
      return { instanceId: null, created: false, reason: existErr.message };
    }

    if (existing && existing.length > 0) {
      const active = existing.find((i) => ACTIVE_STATUSES.has(i.status as string));
      if (active) {
        console.log(
          `[workflowTriggerService] Active workflow instance already exists for ${uniqueUuid} (status=${active.status}); not creating a new one`
        );
        return {
          instanceId: active.id,
          created: false,
          reason: `An active workflow instance already exists (status: ${active.status}).`,
          existingStatus: active.status as string,
        };
      }

      const latestClosed = existing.find((i) => CLOSED_STATUSES.has(i.status as string));
      if (latestClosed && !allowReinitiate) {
        return {
          instanceId: latestClosed.id,
          created: false,
          reason: `Previous workflow ended as ${latestClosed.status}. Re-initiation not permitted.`,
          existingStatus: latestClosed.status as string,
        };
      }
      // Otherwise: closed and re-initiation allowed — fall through to create a new one.
    }

    // 2. Look up workflow trigger
    const { data: triggers, error: triggerError } = await supabase
      .from('workflow_triggers')
      .select('id, workflow_id, action_name, is_active')
      .eq('action_name', 'submit')
      .eq('is_active', true)
      .eq('module_id', moduleId);

    if (triggerError || !triggers || triggers.length === 0) {
      return {
        instanceId: null,
        created: false,
        reason: 'No workflow trigger configured for IP registration submit.',
      };
    }
    const trigger = triggers[0] as WorkflowTrigger;

    // 3. Workflow definition
    const { data: workflow, error: workflowError } = await supabase
      .from('workflow_definitions')
      .select('id, name, default_sla_hours')
      .eq('id', trigger.workflow_id)
      .single();

    if (workflowError || !workflow) {
      return { instanceId: null, created: false, reason: 'Workflow definition not found.' };
    }
    const workflowDef = workflow as WorkflowDefinition;

    // 4. Steps
    const { data: steps, error: stepsError } = await supabase
      .from('workflow_steps')
      .select('id, step_name, step_number, sla_hours, approver_type, approver_role_ids, approver_designation_ids, approver_user_ids')
      .eq('workflow_id', workflowDef.id)
      .order('step_number', { ascending: true });

    if (stepsError || !steps || steps.length === 0) {
      return { instanceId: null, created: false, reason: 'Workflow has no steps configured.' };
    }
    const workflowSteps = steps as WorkflowStep[];

    // 5. Profile lookup for started_by_name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, user_code')
      .eq('id', resolvedUserId)
      .single();

    const startedByName = profile?.full_name || profile?.user_code || 'System';

    const firstStep = workflowSteps[0];
    const dueAt = new Date();
    dueAt.setHours(dueAt.getHours() + (workflowDef.default_sla_hours || 24));

    // 6. Insert workflow instance
    const { data: instance, error: instanceError } = await supabase
      .from('workflow_instances')
      .insert({
        workflow_id: workflowDef.id,
        workflow_name: workflowDef.name,
        source_module: sourceModule,
        source_record_id: uniqueUuid,
        source_record_name: recordName,
        current_step_id: firstStep.id,
        status: 'InProgress',
        started_by: resolvedUserId,
        started_by_name: startedByName,
        due_at: dueAt.toISOString(),
        metadata: {
          ssn,
          applicant_name: recordName,
        },
      })
      .select('id')
      .single();

    if (instanceError || !instance) {
      console.error('[workflowTriggerService] Error creating workflow instance:', instanceError);
      return {
        instanceId: null,
        created: false,
        reason: instanceError?.message || 'Failed to create workflow instance.',
      };
    }

    // 6b. Verify the insert actually committed (catches silent RLS rejection)
    const { data: verifyRow, error: verifyErr } = await supabase
      .from('workflow_instances')
      .select('id')
      .eq('id', instance.id)
      .maybeSingle();

    if (verifyErr || !verifyRow) {
      console.error('[workflowTriggerService] Workflow instance insert did not persist:', verifyErr);
      return {
        instanceId: null,
        created: false,
        reason: 'Workflow instance insert did not persist. Please retry.',
      };
    }

    // 7. First task assignment resolution
    const taskDueAt = new Date();
    taskDueAt.setHours(taskDueAt.getHours() + (firstStep.sla_hours || 24));

    const taskAssignment: {
      assigned_role?: string | null;
      assigned_designation?: string | null;
      assigned_to?: string | null;
    } = {};

    const approverType = firstStep.approver_type || 'role';

    if (approverType === 'role' && firstStep.approver_role_ids?.length) {
      if (firstStep.approver_role_ids.length === 1) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('role_name')
          .eq('id', firstStep.approver_role_ids[0])
          .single();
        if (roleData) taskAssignment.assigned_role = roleData.role_name;
      }
    } else if (approverType === 'designation' && firstStep.approver_designation_ids?.length) {
      if (firstStep.approver_designation_ids.length === 1) {
        taskAssignment.assigned_designation = firstStep.approver_designation_ids[0];
      }
    } else if (
      (approverType === 'user' || approverType === 'specific_users') &&
      firstStep.approver_user_ids?.length
    ) {
      if (firstStep.approver_user_ids.length === 1) {
        taskAssignment.assigned_to = firstStep.approver_user_ids[0];
      }
    } else if (approverType === 'reporting_manager') {
      const resolved = await resolveReportingManagerForTask(
        resolvedUserId,
        instance.id,
        firstStep.id,
        firstStep.step_name,
      );
      if (resolved) taskAssignment.assigned_to = resolved.managerId;
    }

    const { data: taskData, error: taskError } = await supabase
      .from('workflow_tasks')
      .insert({
        instance_id: instance.id,
        step_id: firstStep.id,
        step_name: firstStep.step_name,
        assigned_role: taskAssignment.assigned_role || null,
        assigned_designation: taskAssignment.assigned_designation || null,
        assigned_to: taskAssignment.assigned_to || null,
        status: 'Pending',
        due_at: taskDueAt.toISOString(),
      })
      .select('id')
      .single();

    if (taskError || !taskData) {
      console.error('[workflowTriggerService] Failed to create first workflow task:', taskError);
      return {
        instanceId: instance.id,
        created: true,
        reason: `Workflow instance created but first task assignment failed: ${taskError?.message || 'unknown'}`,
      };
    }

    // 8. Log workflow start
    await supabase.from('workflow_logs').insert({
      instance_id: instance.id,
      step_id: firstStep.id,
      step_name: firstStep.step_name,
      action: 'workflow_started',
      performed_by: resolvedUserId,
      performed_by_name: startedByName,
      details: `Workflow started for IP Registration: ${recordName}`,
    });

    // 9. Notifications (non-critical)
    try {
      await supabase.functions.invoke('workflow-process-notifications', {
        body: {
          instance_id: instance.id,
          step_id: firstStep.id,
          trigger: 'step_entry',
        },
      });
    } catch (notifyError) {
      console.error('[workflowTriggerService] Failed to process step notifications (non-critical):', notifyError);
    }

    console.log(`[workflowTriggerService] Workflow instance ${instance.id} created for record ${uniqueUuid}`);
    return { instanceId: instance.id, created: true };
  } catch (error) {
    console.error('[workflowTriggerService] Error triggering workflow:', error);
    return {
      instanceId: null,
      created: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
