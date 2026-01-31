import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserCode } from './useUserCode';

const formatDbError = (err: unknown): string => {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;

  const anyErr = err as any;
  const message = anyErr?.message || anyErr?.error_description || anyErr?.msg;
  const details = anyErr?.details;
  const hint = anyErr?.hint;
  const code = anyErr?.code;

  return [
    message,
    details ? `Details: ${details}` : null,
    hint ? `Hint: ${hint}` : null,
    code ? `Code: ${code}` : null,
  ]
    .filter(Boolean)
    .join(' | ');
};

export interface C3SubmitResult {
  success: boolean;
  error?: string;
  message?: string;
  workflowInstanceId?: string;
}

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

// Get module ID based on payer type
const getModuleId = (payerType: string): string => {
  // These should be the actual module IDs from app_modules table
  // For C3 Management, we use a single module that handles all types
  // You may need to adjust these based on your actual module configuration
  switch (payerType) {
    case 'ER':
      return 'c3_employer_submission'; // Module name for employer C3
    case 'SE':
      return 'c3_self_employed_submission'; // Module name for self-employed C3
    case 'VC':
      return 'c3_voluntary_submission'; // Module name for voluntary C3
    default:
      return 'c3_management'; // Fallback to general C3 module
  }
};

/**
 * Triggers workflow for the submitted C3 record.
 * Returns the workflow instance ID if a workflow was triggered.
 */
const triggerC3Workflow = async (
  c3Id: string,
  payerType: string,
  recordName: string,
  userId?: string,
  userCode?: string
): Promise<string | null> => {
  try {
    // Look up workflow trigger for c3 + submit action
    // First try to find a trigger by module name
    const moduleNames = [
      getModuleId(payerType),
      'c3_management',
      'c3_submission'
    ];

    let trigger: WorkflowTrigger | null = null;

    // Try to find a trigger for any of the module names
    for (const moduleName of moduleNames) {
      const { data: moduleData } = await supabase
        .from('app_modules')
        .select('id')
        .eq('name', moduleName)
        .single();

      if (moduleData) {
        const { data: triggers } = await supabase
          .from('workflow_triggers')
          .select('id, workflow_id, action_name, is_active')
          .eq('action_name', 'submit')
          .eq('is_active', true)
          .eq('module_id', moduleData.id);

        if (triggers && triggers.length > 0) {
          trigger = triggers[0] as WorkflowTrigger;
          break;
        }
      }
    }

    if (!trigger) {
      console.log('No workflow trigger configured for C3 submit');
      return null;
    }

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
        source_module: `c3_${payerType.toLowerCase()}_submission`,
        source_record_id: c3Id,
        source_record_name: recordName,
        current_step_id: firstStep.id,
        status: 'InProgress',
        started_by: userId,
        started_by_name: profile?.full_name || userCode || 'System',
        due_at: dueAt.toISOString(),
        metadata: {
          payer_type: payerType,
          record_name: recordName,
        }
      })
      .select('id')
      .single();

    if (instanceError || !instance) {
      console.error('Error creating workflow instance:', instanceError);
      return null;
    }

    // Create first task - assignment based on approver_type
    const taskDueAt = new Date();
    taskDueAt.setHours(taskDueAt.getHours() + (firstStep.sla_hours || 24));

    const taskAssignment: {
      assigned_role?: string | null;
      assigned_designation?: string | null;
      assigned_to?: string | null;
    } = {};

    const approverType = firstStep.approver_type || 'role';

    if (approverType === 'role' && firstStep.approver_role_ids && firstStep.approver_role_ids.length > 0) {
      const roleIds = firstStep.approver_role_ids;
      if (roleIds.length === 1) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('role_name')
          .eq('id', roleIds[0])
          .single();

        if (roleData) {
          taskAssignment.assigned_role = roleData.role_name;
        }
      }
    } else if (approverType === 'designation' && firstStep.approver_designation_ids && firstStep.approver_designation_ids.length > 0) {
      const designationIds = firstStep.approver_designation_ids;
      if (designationIds.length === 1) {
        taskAssignment.assigned_designation = designationIds[0];
      }
    } else if ((approverType === 'user' || approverType === 'specific_users') && firstStep.approver_user_ids && firstStep.approver_user_ids.length > 0) {
      const userIds = firstStep.approver_user_ids;
      if (userIds.length === 1) {
        taskAssignment.assigned_to = userIds[0];
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

    // Log workflow start
    await supabase
      .from('workflow_logs')
      .insert({
        instance_id: instance.id,
        step_id: firstStep.id,
        step_name: firstStep.step_name,
        action: 'workflow_started',
        performed_by: userId,
        performed_by_name: profile?.full_name || userCode || 'System',
        details: `Workflow started for C3 Submission: ${recordName}`,
      });

    // Notify approvers via edge function
    if (taskData?.id) {
      try {
        await supabase.functions.invoke('workflow-notify-approvers', {
          body: {
            instance_id: instance.id,
            step_id: firstStep.id,
            task_id: taskData.id,
            workflow_name: workflowDef.name,
            source_record_name: recordName,
            source_module: `c3_${payerType.toLowerCase()}_submission`,
          },
        });
        console.log('Approvers notified successfully');
      } catch (notifyError) {
        console.error('Failed to notify approvers (non-critical):', notifyError);
      }
    }

    return instance.id;
  } catch (error) {
    console.error('Error triggering workflow:', error);
    return null;
  }
};

/**
 * Hook providing unified C3 submission functionality with workflow integration.
 * Similar to useIPRegistrationSubmit.
 */
export function useC3Submit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInProgressRef = useRef(false);
  const { userCode, userId } = useUserCode();

  /**
   * Submit a C3 record - transitions from DFT to PEN and triggers workflow if configured.
   */
  const submitC3Record = useCallback(async (
    c3Id: string,
    payerType: string,
    recordName: string
  ): Promise<C3SubmitResult> => {
    // Prevent duplicate submissions
    if (submissionInProgressRef.current) {
      return { success: false, error: 'Submission already in progress' };
    }

    submissionInProgressRef.current = true;
    setIsSubmitting(true);

    try {
      // Call the submit_c3_record RPC
      const { data: submitData, error: submitError } = await supabase.rpc('submit_c3_record', {
        p_c3_id: c3Id,
        p_user_id: userId || null,
      });

      if (submitError) {
        throw new Error(formatDbError(submitError));
      }

      const result = submitData as any;
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to submit C3 record');
      }

      // Trigger workflow (if configured)
      const workflowInstanceId = await triggerC3Workflow(
        c3Id,
        payerType,
        recordName,
        userId || undefined,
        userCode || undefined
      );

      return {
        success: true,
        message: result.message || 'C3 record submitted successfully',
        workflowInstanceId: workflowInstanceId || undefined,
      };
    } catch (error) {
      console.error('Submit error:', error);
      return {
        success: false,
        error: formatDbError(error),
      };
    } finally {
      setIsSubmitting(false);
      submissionInProgressRef.current = false;
    }
  }, [userId, userCode]);

  return {
    submitC3Record,
    isSubmitting,
  };
}
