import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export interface ERSubmitData {
  regno: string;
  name?: string | null;
  trade_name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string;
}

export interface ValidationErrors {
  [key: string]: string;
}

export interface SubmitResult {
  success: boolean;
  regno?: string;
  errors?: ValidationErrors;
  message?: string;
  workflowInstanceId?: string;
}

/**
 * Validates required fields for ER submission.
 */
export const validateERRegistrationForSubmit = (data: ERSubmitData): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.name?.trim()) errors.name = 'Employer name is required';
  if (!data.email?.trim()) errors.email = 'Email is required';
  if (!data.phone?.trim()) errors.phone = 'Phone is required';

  return errors;
};

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

// Employer Registration module ID
const ER_MODULE_ID = '683ed102-9a5a-41d7-91d3-1e00c2e15a15';

/**
 * Hook providing unified ER Registration submission functionality.
 */
export function useEmployerRegistrationSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInProgressRef = useRef(false);

  /**
   * Fetches the complete record data from er_master for validation.
   */
  const fetchRecordData = async (regno: string): Promise<ERSubmitData | null> => {
    const { data, error } = await supabase
      .from('er_master')
      .select('regno, name, trade_name, email, phone, status')
      .eq('regno', regno)
      .single();

    if (error) {
      console.error('Error fetching record:', error);
      throw new Error(formatDbError(error));
    }

    return data as ERSubmitData;
  };

  /**
   * Triggers workflow for the submitted ER registration.
   */
  const triggerWorkflow = async (
    regno: string,
    recordName: string,
    userId?: string
  ): Promise<string | null> => {
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

      // Create first task
      const taskDueAt = new Date();
      taskDueAt.setHours(taskDueAt.getHours() + (firstStep.sla_hours || 24));

      // Determine task assignment
      const taskAssignment: {
        assigned_role?: string | null;
        assigned_designation?: string | null;
        assigned_to?: string | null;
      } = {};

      const approverType = (firstStep as any).approver_type || 'role';
      
      if (approverType === 'role' && (firstStep as any).approver_role_ids && (firstStep as any).approver_role_ids.length > 0) {
        const roleIds = (firstStep as any).approver_role_ids as string[];
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
      } else if (approverType === 'designation' && (firstStep as any).approver_designation_ids && (firstStep as any).approver_designation_ids.length > 0) {
        const designationIds = (firstStep as any).approver_designation_ids as string[];
        if (designationIds.length === 1) {
          taskAssignment.assigned_designation = designationIds[0];
        }
      } else if ((approverType === 'user' || approverType === 'specific_users') && (firstStep as any).approver_user_ids && (firstStep as any).approver_user_ids.length > 0) {
        const userIds = (firstStep as any).approver_user_ids as string[];
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
          performed_by_name: profile?.full_name || 'System',
          details: `Workflow started for Employer Registration: ${recordName}`,
        });

      // Notify approvers
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
   * Main submit function for ER Registration submission.
   * Uses the database RPC function to atomically:
   * 1. Generate a permanent registration number
   * 2. Update the record from temp regno to permanent
   * 3. Update status to Pending
   * 4. Update all related tables with the new regno
   */
  const submitERRegistration = useCallback(async (
    tempRegno: string,
    userId?: string
  ): Promise<SubmitResult> => {
    // Prevent duplicate submissions
    if (submissionInProgressRef.current) {
      return { success: false, message: 'Submission already in progress' };
    }

    submissionInProgressRef.current = true;
    setIsSubmitting(true);

    try {
      // Fetch the complete record for validation
      const recordData = await fetchRecordData(tempRegno);
      if (!recordData) {
        throw new Error('Record not found');
      }

      // Verify record is in draft status
      if (recordData.status !== 'Z') {
        throw new Error('Only draft records can be submitted');
      }

      // Validate all required fields
      const validationErrors = validateERRegistrationForSubmit(recordData);
      if (Object.keys(validationErrors).length > 0) {
        const firstError = Object.values(validationErrors)[0];
        return {
          success: false,
          errors: validationErrors,
          message: firstError,
        };
      }

      // Call the RPC function to atomically submit and generate permanent regno
      const { data: rpcResult, error: rpcError } = await supabase.rpc('submit_er_registration', {
        p_temp_regno: tempRegno,
        p_user_id: userId || null,
      });

      if (rpcError) {
        throw new Error(formatDbError(rpcError));
      }

      const result = rpcResult as { success: boolean; old_regno: string; new_regno: string; status: string };
      
      if (!result.success) {
        throw new Error('Submission failed');
      }

      const newRegno = result.new_regno;
      const recordName = recordData.name || newRegno;
      
      // Trigger workflow with the new permanent regno (if configured)
      const workflowInstanceId = await triggerWorkflow(newRegno, recordName, userId);

      return {
        success: true,
        regno: newRegno,
        workflowInstanceId: workflowInstanceId || undefined,
        message: `Registration submitted successfully. New Registration No: ${newRegno}`,
      };
    } catch (error) {
      console.error('Submit error:', error);
      return {
        success: false,
        message: formatDbError(error),
      };
    } finally {
      setIsSubmitting(false);
      submissionInProgressRef.current = false;
    }
  }, []);

  return {
    submitERRegistration,
    isSubmitting,
    validateERRegistrationForSubmit,
  };
}
