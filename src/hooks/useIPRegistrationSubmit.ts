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

export interface IPSubmitData {
  unique_uuid: string;
  application_id?: string;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  marital_status?: string | null;
  date_married?: string | null;
  nationality?: string | null;
  birth_place?: string | null;
  title?: string | null;
  citizenship?: string | null;
  place_of_residence?: string | null;
  work_permit_status?: string | null;
  work_permit_expiry?: string | null;
  birth_doc_type?: string | null;
  name_doc_type?: string | null;
  status?: string;
  id?: string;
}

export interface ValidationErrors {
  [key: string]: string;
}

export interface SubmitResult {
  success: boolean;
  ssn?: string;
  errors?: ValidationErrors;
  message?: string;
  workflowInstanceId?: string;
}

/**
 * Validates all required fields for IP Registration submission.
 * This is the SINGLE SOURCE OF TRUTH for submission validation.
 */
export const validateIPRegistrationForSubmit = (data: IPSubmitData): ValidationErrors => {
  const errors: ValidationErrors = {};

  // Basic Details validation
  if (!data.first_name?.trim()) errors.first_name = 'First name is required';
  if (!data.last_name?.trim()) errors.last_name = 'Last name is required';
  if (!data.gender) errors.gender = 'Gender is required';
  if (!data.date_of_birth) errors.date_of_birth = 'Date of birth is required';
  if (!data.marital_status) errors.marital_status = 'Marital status is required';
  if (!data.nationality) errors.nationality = 'Nationality is required';
  if (!data.birth_place) errors.birth_place = 'Birth place is required';
  if (!data.title) errors.title = 'Title is required';

  // Marital status validation
  if ((data.marital_status === 'Married' || data.marital_status === 'Common Law') && !data.date_married) {
    errors.date_married = 'Date married is required';
  }
  if (data.date_married && data.date_of_birth) {
    if (new Date(data.date_married) <= new Date(data.date_of_birth)) {
      errors.date_married = 'Date married must be after date of birth';
    }
  }

  // Employment validation for non-citizens
  if (data.citizenship === 'N' && data.place_of_residence === 'RES') {
    if (!data.work_permit_status || data.work_permit_status === 'N') {
      errors.work_permit_status = 'Work permit is required for non-citizen residents';
    }
    if (!data.work_permit_expiry) {
      errors.work_permit_expiry = 'Work permit expiry is required';
    }
  }

  // Document verification
  if (!data.birth_doc_type) errors.birth_doc_type = 'Birth status verification is required';
  if (!data.name_doc_type) errors.name_doc_type = 'Name status verification is required';

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

/**
 * Hook providing unified IP Registration submission functionality.
 * This is the SINGLE SOURCE OF TRUTH for submitting IP registrations.
 * Both List screen and Edit screen MUST use this hook.
 */
export function useIPRegistrationSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInProgressRef = useRef(false);

  /**
   * Fetches the complete record data from ip_master for validation.
   */
  const fetchRecordData = async (uniqueUuid: string): Promise<IPSubmitData | null> => {
    const { data, error } = await supabase
      .from('ip_master')
      .select('unique_uuid, application_id, first_name, middle_name, last_name, gender, date_of_birth, marital_status, date_married, nationality, birth_place, title, citizenship, place_of_residence, work_permit_status, work_permit_expiry, birth_doc_type, name_doc_type, status, id')
      .eq('unique_uuid', uniqueUuid)
      .single();

    if (error) {
      console.error('Error fetching record:', error);
      throw new Error(formatDbError(error));
    }

    return data as IPSubmitData;
  };

  /**
   * Triggers workflow for the submitted IP registration.
   * Returns the workflow instance ID if a workflow was triggered.
   */
  const triggerWorkflow = async (
    uniqueUuid: string,
    ssn: string,
    recordName: string,
    userId?: string
  ): Promise<string | null> => {
    try {
      // Look up workflow trigger for insured_person_registration + submit
      const { data: triggers, error: triggerError } = await supabase
        .from('workflow_triggers')
        .select('id, workflow_id, action_name, is_active')
        .eq('action_name', 'submit')
        .eq('is_active', true)
        .eq('module_id', '305eaff7-8446-47e0-a7ac-186da08b91ee');

      if (triggerError || !triggers || triggers.length === 0) {
        console.log('No workflow trigger configured for IP registration submit');
        return null;
      }

      const trigger = triggers[0] as WorkflowTrigger;

      // Get workflow
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

      // Get workflow steps - include all approver fields for proper assignment
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
          source_module: 'insured_person_registration',
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

      // Determine task assignment based on approver_type
      const taskAssignment: {
        assigned_role?: string | null;
        assigned_designation?: string | null;
        assigned_to?: string | null;
      } = {};

      const approverType = (firstStep as any).approver_type || 'role';
      
      if (approverType === 'role' && (firstStep as any).approver_role_ids && (firstStep as any).approver_role_ids.length > 0) {
        // For role-based assignment, we need to get the role name from the first role ID
        // But since tasks can be assigned to multiple roles, we'll leave assigned_role null
        // and let permission check use approver_role_ids from the step
        // However, for backward compatibility, we can set a role name if there's only one role
        const roleIds = (firstStep as any).approver_role_ids as string[];
        if (roleIds.length === 1) {
          // Get role name for single role assignment
          const { data: roleData } = await supabase
            .from('AspNetRoles')
            .select('Name')
            .eq('Id', roleIds[0])
            .single();
          
          if (roleData) {
            taskAssignment.assigned_role = roleData.Name;
          }
        }
        // If multiple roles, assigned_role stays null - permission check will use approver_role_ids
      } else if (approverType === 'designation' && (firstStep as any).approver_designation_ids && (firstStep as any).approver_designation_ids.length > 0) {
        // For designation-based, use first designation ID
        const designationIds = (firstStep as any).approver_designation_ids as string[];
        if (designationIds.length === 1) {
          taskAssignment.assigned_designation = designationIds[0];
        }
      } else if ((approverType === 'user' || approverType === 'specific_users') && (firstStep as any).approver_user_ids && (firstStep as any).approver_user_ids.length > 0) {
        // For user-based, assign to first user (or could create multiple tasks for parallel approval)
        const userIds = (firstStep as any).approver_user_ids as string[];
        if (userIds.length === 1) {
          taskAssignment.assigned_to = userIds[0];
        }
        // For multiple users with parallel_approval, you might want to create multiple tasks
        // For now, we'll assign to first user
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
          details: `Workflow started for IP Registration: ${recordName}`,
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
              source_module: 'insured_person_registration',
            },
          });
          console.log('Approvers notified successfully');
        } catch (notifyError) {
          console.error('Failed to notify approvers (non-critical):', notifyError);
          // Don't fail the workflow creation if notification fails
        }
      }

      return instance.id;
    } catch (error) {
      console.error('Error triggering workflow:', error);
      return null;
    }
  };

  /**
   * Main submit function - the SINGLE SOURCE OF TRUTH for IP Registration submission.
   */
  const submitIPRegistration = useCallback(async (
    uniqueUuid: string,
    userId?: string,
    unsavedData?: Partial<IPSubmitData>
  ): Promise<SubmitResult> => {
    // Prevent duplicate submissions
    if (submissionInProgressRef.current) {
      return { success: false, message: 'Submission already in progress' };
    }

    submissionInProgressRef.current = true;
    setIsSubmitting(true);

    try {
      // Step 1: If there's unsaved data, save it first
      if (unsavedData && Object.keys(unsavedData).length > 0) {
        const updateData: Record<string, unknown> = {
          ...unsavedData,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        };
        delete updateData.unique_uuid;
        delete updateData.id;
        
        const { error: saveError } = await supabase
          .from('ip_master')
          .update(updateData)
          .eq('unique_uuid', uniqueUuid);

        if (saveError) {
          throw new Error(`Failed to save draft data before submission: ${formatDbError(saveError)}`);
        }
      }

      // Step 2: Fetch the complete record for validation
      const recordData = await fetchRecordData(uniqueUuid);
      if (!recordData) {
        throw new Error('Record not found');
      }

      // Verify record is in draft status
      if (recordData.status !== 'Z') {
        throw new Error('Only draft records can be submitted');
      }

      // Step 3: Validate all fields
      const validationErrors = validateIPRegistrationForSubmit(recordData);
      if (Object.keys(validationErrors).length > 0) {
        const firstError = Object.values(validationErrors)[0];
        return {
          success: false,
          errors: validationErrors,
          message: firstError,
        };
      }

      // Step 4: Atomic backend submit (SSN generation + status update)
      const { data: submitData, error: submitError } = await supabase.rpc('submit_ip_registration', {
        p_unique_uuid: uniqueUuid,
      });

      if (submitError) {
        throw new Error(formatDbError(submitError));
      }

      const ssnData = (submitData as any)?.ssn as string | undefined;
      if (!ssnData) {
        throw new Error('Submission succeeded but SSN was not returned');
      }

      // Step 6: Trigger workflow (if configured)
      const recordName = `${recordData.first_name || ''} ${recordData.last_name || ''}`.trim();
      const workflowInstanceId = await triggerWorkflow(uniqueUuid, ssnData, recordName, userId);

      // Step 7: Log audit entry
      if (recordData.id) {
        await supabase.from('ip_audit_log').insert({
          table_name: 'ip_master',
          record_id: recordData.id,
          unique_uuid: uniqueUuid,
          action: 'SUBMIT',
          changed_by: userId,
          old_value: 'Z',
          new_value: 'P',
          field_name: 'status',
        });
      }

      return {
        success: true,
        ssn: ssnData,
        workflowInstanceId: workflowInstanceId || undefined,
        message: `Registration submitted successfully. SSN: ${ssnData}`,
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
    submitIPRegistration,
    isSubmitting,
    validateIPRegistrationForSubmit,
  };
}
