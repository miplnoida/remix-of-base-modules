/**
 * Employer Workflow Trigger Service
 * 
 * Shared service to trigger the "Employer Registration Approval Workflow"
 * for newly created employer registrations. Can be called from:
 * - Meeting approval flow (via edge function server-side)
 * - Manual employer registration submission (client-side)
 * 
 * For meeting-based approvals, the edge function handles this server-side.
 * This client-side service is kept for the manual submission flow.
 */

import { supabase } from '@/integrations/supabase/client';

const ER_MODULE_ID = '683ed102-9a5a-41d7-91d3-1e00c2e15a15';

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

/**
 * Triggers the employer registration approval workflow for a given regno.
 * Returns the new workflow instance ID or null if no trigger is configured.
 */
export async function triggerEmployerRegistrationWorkflow(
  regno: string,
  recordName: string,
  userId?: string
): Promise<string | null> {
  try {
    // Look up workflow trigger for employers module + submit
    const { data: triggers, error: triggerError } = await supabase
      .from('workflow_triggers')
      .select('id, workflow_id, action_name, is_active')
      .eq('action_name', 'submit')
      .eq('is_active', true)
      .eq('module_id', ER_MODULE_ID);

    if (triggerError || !triggers || triggers.length === 0) {
      console.log('No workflow trigger configured for ER registration submit');
      return null;
    }

    const trigger = triggers[0] as WorkflowTrigger;

    // Get workflow definition
    const { data: workflow, error: workflowError } = await supabase
      .from('workflow_definitions')
      .select('id, name, default_sla_hours')
      .eq('id', trigger.workflow_id)
      .single();

    if (workflowError || !workflow) {
      console.log('Workflow not found');
      return null;
    }

    const workflowDef = workflow as WorkflowDefinition;

    // Get workflow steps
    const { data: steps, error: stepsError } = await supabase
      .from('workflow_steps')
      .select('id, step_name, step_number, sla_hours, approver_type, approver_role_ids, approver_designation_ids, approver_user_ids')
      .eq('workflow_id', workflowDef.id)
      .order('step_number', { ascending: true });

    if (stepsError || !steps || steps.length === 0) {
      console.log('Workflow has no steps configured');
      return null;
    }

    const workflowSteps = steps as WorkflowStep[];

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const firstStep = workflowSteps[0];
    const dueAt = new Date();
    dueAt.setHours(dueAt.getHours() + (workflowDef.default_sla_hours || 24));

    // Create workflow instance
    const { data: instance, error: instanceError } = await supabase
      .from('workflow_instances')
      .insert({
        workflow_id: workflowDef.id,
        workflow_name: workflowDef.name,
        source_module: 'employers',
        source_record_id: regno,
        source_record_name: recordName,
        current_step_id: firstStep.id,
        status: 'InProgress',
        started_by: userId,
        started_by_name: profile?.full_name || 'System',
        due_at: dueAt.toISOString(),
        metadata: {
          regno,
          employer_name: recordName,
        }
      })
      .select('id')
      .single();

    if (instanceError || !instance) {
      console.error('Error creating workflow instance:', instanceError);
      return null;
    }

    // Determine task assignment
    const taskAssignment: {
      assigned_role?: string | null;
      assigned_designation?: string | null;
      assigned_to?: string | null;
    } = {};

    const approverType = (firstStep as any).approver_type || 'role';

    if (approverType === 'role' && (firstStep as any).approver_role_ids?.length > 0) {
      const roleIds = (firstStep as any).approver_role_ids as string[];
      if (roleIds.length === 1) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('role_name')
          .eq('id', roleIds[0])
          .single();
        if (roleData) taskAssignment.assigned_role = roleData.role_name;
      }
    } else if (approverType === 'designation' && (firstStep as any).approver_designation_ids?.length > 0) {
      const designationIds = (firstStep as any).approver_designation_ids as string[];
      if (designationIds.length === 1) taskAssignment.assigned_designation = designationIds[0];
    } else if ((approverType === 'user' || approverType === 'specific_users') && (firstStep as any).approver_user_ids?.length > 0) {
      const userIds = (firstStep as any).approver_user_ids as string[];
      if (userIds.length === 1) taskAssignment.assigned_to = userIds[0];
    } else if (approverType === 'reporting_manager') {
      const { resolveReportingManagerForTask } = await import('@/services/resolveReportingManager');
      if (userId) {
        const resolved = await resolveReportingManagerForTask(userId, instance.id, firstStep.id, firstStep.step_name);
        if (resolved) taskAssignment.assigned_to = resolved.managerId;
      }
    }

    // Create first task
    const taskDueAt = new Date();
    taskDueAt.setHours(taskDueAt.getHours() + (firstStep.sla_hours || 24));

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

    // Log workflow start
    await supabase.from('workflow_logs').insert({
      instance_id: instance.id,
      step_id: firstStep.id,
      step_name: firstStep.step_name,
      action: 'workflow_started',
      user_id: userId,
      user_name: profile?.full_name || 'System',
      comments: `Workflow started for Employer Registration: ${recordName}`,
    });

    // Notify approvers (non-blocking)
    if (taskData?.id) {
      try {
        await supabase.functions.invoke('workflow-notify-approvers', {
          body: {
            instance_id: instance.id,
            step_id: firstStep.id,
            task_id: taskData.id,
            workflow_name: workflowDef.name,
            source_record_name: recordName,
            source_module: 'employers',
          },
        });
      } catch (notifyError) {
        console.error('Failed to notify approvers (non-critical):', notifyError);
      }
    }

    return instance.id;
  } catch (error) {
    console.error('Error triggering employer workflow:', error);
    return null;
  }
}
