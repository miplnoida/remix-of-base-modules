/**
 * Shared Workflow Trigger Service
 * 
 * Centralizes the logic for triggering workflow instances on IP Registration submissions.
 * Used by both manual submission (useIPRegistrationSubmit) and programmatic conversion
 * (useConvertToIPRegistration) to ensure consistency.
 */
import { supabase } from '@/integrations/supabase/client';

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
}

/**
 * Triggers a workflow instance for an IP Registration record.
 * Returns the workflow instance ID if a workflow was triggered, null otherwise.
 */
export async function triggerIPRegistrationWorkflow({
  uniqueUuid,
  ssn,
  recordName,
  userId,
  sourceModule = 'insured_person_registration',
  moduleId = '305eaff7-8446-47e0-a7ac-186da08b91ee',
}: TriggerWorkflowParams): Promise<string | null> {
  try {
    // 1. Check for duplicate — don't create if one already exists
    const { data: existing } = await supabase
      .from('workflow_instances')
      .select('id')
      .eq('source_module', sourceModule)
      .eq('source_record_id', uniqueUuid)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`[workflowTriggerService] Workflow instance already exists for ${uniqueUuid}, skipping`);
      return existing[0].id;
    }

    // 2. Look up workflow trigger for insured_person_registration + submit
    const { data: triggers, error: triggerError } = await supabase
      .from('workflow_triggers')
      .select('id, workflow_id, action_name, is_active')
      .eq('action_name', 'submit')
      .eq('is_active', true)
      .eq('module_id', moduleId);

    if (triggerError || !triggers || triggers.length === 0) {
      console.log('[workflowTriggerService] No workflow trigger configured for IP registration submit');
      return null;
    }

    const trigger = triggers[0] as WorkflowTrigger;

    // 3. Get workflow definition
    const { data: workflow, error: workflowError } = await supabase
      .from('workflow_definitions')
      .select('id, name, default_sla_hours')
      .eq('id', trigger.workflow_id)
      .single();

    if (workflowError || !workflow) {
      console.log('[workflowTriggerService] Workflow definition not found');
      return null;
    }

    const workflowDef = workflow as WorkflowDefinition;

    // 4. Get workflow steps
    const { data: steps, error: stepsError } = await supabase
      .from('workflow_steps')
      .select('id, step_name, step_number, sla_hours, approver_type, approver_role_ids, approver_designation_ids, approver_user_ids')
      .eq('workflow_id', workflowDef.id)
      .order('step_number', { ascending: true });

    if (stepsError || !steps || steps.length === 0) {
      console.log('[workflowTriggerService] Workflow has no steps configured');
      return null;
    }

    const workflowSteps = steps as WorkflowStep[];

    // 5. Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const firstStep = workflowSteps[0];
    const dueAt = new Date();
    dueAt.setHours(dueAt.getHours() + (workflowDef.default_sla_hours || 24));

    // 6. Create workflow instance
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
        started_by: userId,
        started_by_name: profile?.full_name || 'System',
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
      return null;
    }

    // 7. Create first task with proper role/designation/user assignment
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
        if (roleData) {
          taskAssignment.assigned_role = roleData.role_name;
        }
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
    }

    const { data: taskData } = await supabase
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

    // 8. Log workflow start
    await supabase.from('workflow_logs').insert({
      instance_id: instance.id,
      step_id: firstStep.id,
      step_name: firstStep.step_name,
      action: 'workflow_started',
      performed_by: userId,
      performed_by_name: profile?.full_name || 'System',
      details: `Workflow started for IP Registration: ${recordName}`,
    });

    // 9. Notify approvers (non-blocking)
    if (taskData?.id) {
      try {
        await supabase.functions.invoke('workflow-notify-approvers', {
          body: {
            instance_id: instance.id,
            step_id: firstStep.id,
            task_id: taskData.id,
            workflow_name: workflowDef.name,
            source_record_name: recordName,
            source_module: sourceModule,
          },
        });
        console.log('[workflowTriggerService] Approvers notified successfully');
      } catch (notifyError) {
        console.error('[workflowTriggerService] Failed to notify approvers (non-critical):', notifyError);
      }
    }

    console.log(`[workflowTriggerService] Workflow instance ${instance.id} created for record ${uniqueUuid}`);
    return instance.id;
  } catch (error) {
    console.error('[workflowTriggerService] Error triggering workflow:', error);
    return null;
  }
}
