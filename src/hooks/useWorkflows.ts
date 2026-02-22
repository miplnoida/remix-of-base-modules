import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logApplicationError } from '@/lib/globalErrorHandler';

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string | null;
  process_type: string;
  default_sla_hours: number;
  is_active: boolean;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  secured_module_id: string | null;
  secured_table: string | null;
  maker_checker_enabled: boolean;
}

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  step_number: number;
  step_name: string;
  assigned_role: string | null;
  assigned_designation: string | null;
  action_type: string;
  sla_hours: number;
  is_final_step: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStepAction {
  id: string;
  step_id: string;
  action_name: string;
  action_type: string;
  next_step_type: 'next_step' | 'specific_step' | 'end_workflow' | 'send_back_to_applicant' | 'pause_workflow';
  next_step_id: string | null;
  end_state: 'Approved' | 'Rejected' | null;
  is_final_action: boolean;
  display_order: number;
  notification_type: string | null;
  notification_module_id: string | null;
  notification_template_id: string | null;
  created_at: string;
}

export interface WorkflowActionNotification {
  id: string;
  action_id: string;
  notification_type: string;
  template_id: string | null;
  created_at: string;
}

export interface WorkflowTrigger {
  id: string;
  module_id: string | null;
  action_name: string;
  workflow_id: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowInstance {
  id: string;
  workflow_id: string;
  workflow_name: string;
  source_module: string | null;
  source_record_id: string | null;
  source_record_name: string | null;
  current_step_id: string | null;
  status: string;
  started_by: string | null;
  started_by_name: string | null;
  started_at: string;
  completed_at: string | null;
  due_at: string | null;
  metadata: Record<string, any>;
}

export interface WorkflowTask {
  id: string;
  instance_id: string;
  step_id: string;
  step_name: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  assigned_role: string | null;
  assigned_designation: string | null;
  status: string;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  action_taken: string | null;
  comments: string | null;
  created_at: string;
  workflow_instance?: WorkflowInstance;
}

export interface WorkflowLog {
  id: string;
  instance_id: string;
  step_id: string | null;
  step_name: string | null;
  user_id: string | null;
  user_name: string | null;
  action: string;
  old_status: string | null;
  new_status: string | null;
  comments: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

// Fetch all workflow definitions
export function useWorkflowDefinitions() {
  return useQuery({
    queryKey: ['workflow-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_definitions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as WorkflowDefinition[];
    },
  });
}

// Fetch single workflow with steps
export function useWorkflowWithSteps(workflowId: string | null) {
  return useQuery({
    queryKey: ['workflow-with-steps', workflowId],
    queryFn: async () => {
      if (!workflowId) return null;
      
      const { data: workflow, error: workflowError } = await supabase
        .from('workflow_definitions')
        .select('*')
        .eq('id', workflowId)
        .single();
      
      if (workflowError) throw workflowError;
      
      const { data: steps, error: stepsError } = await supabase
        .from('workflow_steps')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('step_number', { ascending: true });
      
      if (stepsError) throw stepsError;
      
      // Fetch actions for each step
      const stepsWithActions = await Promise.all(
        (steps as WorkflowStep[]).map(async (step) => {
          const { data: actions } = await supabase
            .from('workflow_step_actions')
            .select('*')
            .eq('step_id', step.id)
            .order('display_order', { ascending: true });
          
          // Fetch notifications and field updates for each action
          const actionsWithNotifications = await Promise.all(
            (actions || []).map(async (action: WorkflowStepAction) => {
              const { data: notifications } = await supabase
                .from('workflow_action_notifications')
                .select('*')
                .eq('action_id', action.id);
              
              const { data: fieldUpdates } = await supabase
                .from('workflow_action_field_updates')
                .select('*')
                .eq('action_id', action.id)
                .order('display_order', { ascending: true });
              
              return { ...action, notifications: notifications || [], fieldUpdates: fieldUpdates || [] };
            })
          );
          
          return { ...step, actions: actionsWithNotifications };
        })
      );
      
      return { ...workflow, steps: stepsWithActions } as WorkflowDefinition & { 
        steps: (WorkflowStep & { 
          actions: (WorkflowStepAction & { notifications: WorkflowActionNotification[] })[] 
        })[] 
      };
    },
    enabled: !!workflowId,
  });
}

// Create workflow
export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<WorkflowDefinition>) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data: workflow, error } = await supabase
        .from('workflow_definitions')
        .insert({
          name: data.name,
          description: data.description,
          process_type: data.process_type,
          default_sla_hours: data.default_sla_hours || 24,
          is_active: data.is_active || false,
          maker_checker_enabled: data.maker_checker_enabled || false,
          created_by: user.user?.id,
          secured_module_id: data.secured_module_id || null,
          secured_table: data.secured_table || null,
        } as any)
        .select()
        .single();
      
      if (error) throw error;
      return workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-definitions'] });
      toast({ title: 'Success', description: 'Workflow created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Update workflow
export function useUpdateWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<WorkflowDefinition> & { id: string }) => {
      const { data: workflow, error } = await supabase
        .from('workflow_definitions')
        .update({
          name: data.name,
          description: data.description,
          process_type: data.process_type,
          default_sla_hours: data.default_sla_hours,
          is_active: data.is_active,
          maker_checker_enabled: data.maker_checker_enabled,
          secured_module_id: data.secured_module_id,
          secured_table: data.secured_table,
        } as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return workflow;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-with-steps', variables.id] });
      toast({ title: 'Success', description: 'Workflow updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Delete workflow
export function useDeleteWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Check if any instances exist
      const { data: instances } = await supabase
        .from('workflow_instances')
        .select('id')
        .eq('workflow_id', id)
        .limit(1);
      
      if (instances && instances.length > 0) {
        throw new Error('Cannot delete workflow with existing instances');
      }
      
      const { error } = await supabase
        .from('workflow_definitions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-definitions'] });
      toast({ title: 'Success', description: 'Workflow deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Toggle workflow active status
export function useToggleWorkflowStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('workflow_definitions')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-definitions'] });
      toast({ title: 'Success', description: 'Workflow status updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Clone workflow with all configuration
export function useCloneWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sourceWorkflowId, newName }: { sourceWorkflowId: string; newName?: string }) => {
      const { data, error } = await supabase
        .rpc('clone_workflow', {
          p_source_workflow_id: sourceWorkflowId,
          p_new_name: newName || null,
        });
      
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-definitions'] });
      toast({ title: 'Success', description: 'Workflow cloned successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Save workflow steps
export function useSaveWorkflowSteps() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ workflowId, steps }: { 
      workflowId: string; 
      steps: Array<Omit<WorkflowStep, 'id' | 'workflow_id' | 'created_at' | 'updated_at'> & { 
        id?: string;
        actions?: Array<Omit<WorkflowStepAction, 'id' | 'step_id' | 'created_at'> & { 
          id?: string;
          notifications?: Array<Omit<WorkflowActionNotification, 'id' | 'action_id' | 'created_at'> & { id?: string }>
        }>
      }> 
    }) => {
      // IMPORTANT: Do NOT delete all steps for existing workflows.
      // Existing workflow instances reference workflow_steps.id via FK (e.g. workflow_instances.current_step_id).

      const { data: existingSteps, error: existingStepsError } = await supabase
        .from('workflow_steps')
        .select('id')
        .eq('workflow_id', workflowId);

      if (existingStepsError) throw existingStepsError;

      const incomingStepIds = new Set(
        steps.map((s) => s.id).filter(Boolean) as string[]
      );

      const stepIdsToDelete = (existingSteps || [])
        .map((s) => s.id)
        .filter((id) => !incomingStepIds.has(id));

      // Delete only steps removed by admin; skip any referenced by existing instances
      const skippedStepNames: string[] = [];
      if (stepIdsToDelete.length > 0) {
        for (const stepId of stepIdsToDelete) {
          const { error: deleteStepError } = await supabase
            .from('workflow_steps')
            .delete()
            .eq('id', stepId);

          if (deleteStepError) {
            if ((deleteStepError as any).code === '23503') {
              // FK violation — step is in use, skip it gracefully
              // Fetch step name for user-friendly warning
              const { data: stepInfo } = await supabase
                .from('workflow_steps')
                .select('step_name')
                .eq('id', stepId)
                .single();
              skippedStepNames.push(stepInfo?.step_name || stepId);
              continue;
            }
            throw deleteStepError;
          }
        }
      }

      // Clear step_number on ALL remaining steps (kept + skipped) to avoid unique constraint violations during reorder
      const existingStepIdsToKeep = steps.map(s => s.id).filter(Boolean) as string[];

      // Also collect IDs of skipped (FK-referenced) steps that still exist in the DB
      const { data: remainingDbSteps } = await supabase
        .from('workflow_steps')
        .select('id')
        .eq('workflow_id', workflowId);

      const allRemainingIds = (remainingDbSteps || []).map(s => s.id);

      if (allRemainingIds.length > 0) {
        for (let i = 0; i < allRemainingIds.length; i++) {
          const { error: clearError } = await supabase
            .from('workflow_steps')
            .update({ step_number: -(i + 1000) } as any)
            .eq('id', allRemainingIds[i]);
          if (clearError) throw clearError;
        }
      }

      // Upsert / insert steps, then sync actions + notifications per step
      for (const step of steps) {
        let stepId = step.id;

        const stepPayload = {
          workflow_id: workflowId,
          step_number: step.step_number,
          step_name: step.step_name,
          description: (step as any).description || null,
          assigned_role: step.assigned_role,
          assigned_designation: step.assigned_designation,
          action_type: step.action_type,
          sla_hours: step.sla_hours,
          is_final_step: step.is_final_step,
          approver_type: (step as any).approver_type || 'role',
          approver_role_ids: (step as any).approver_role_ids || null,
          approver_designation_ids: (step as any).approver_designation_ids || null,
          approver_user_ids: (step as any).approver_user_ids || null,
          parallel_approval: (step as any).parallel_approval || false,
          required_approvals: (step as any).required_approvals || 1,
          auto_approve_on_timeout: (step as any).auto_approve_on_timeout || false,
          has_condition: (step as any).has_condition || false,
          condition_expression: (step as any).condition_expression || null,
          escalation_enabled: (step as any).escalation_enabled || false,
          escalation_notification_type: (step as any).escalation_notification_type || null,
          escalation_module_id: (step as any).escalation_module_id || null,
          escalation_template_id: (step as any).escalation_template_id || null,
        };

        if (stepId) {
          const { error: stepUpsertError } = await supabase
            .from('workflow_steps')
            .upsert({ id: stepId, ...stepPayload } as any);

          if (stepUpsertError) throw stepUpsertError;
        } else {
          const { data: insertedStep, error: stepInsertError } = await supabase
            .from('workflow_steps')
            .insert(stepPayload as any)
            .select('id')
            .single();

          if (stepInsertError) throw stepInsertError;
          stepId = insertedStep.id;
        }

        // Sync actions for this step
        const stepActions = step.actions || [];

        const { data: existingActions, error: existingActionsError } = await supabase
          .from('workflow_step_actions')
          .select('id')
          .eq('step_id', stepId);

        if (existingActionsError) throw existingActionsError;

        const incomingActionIds = new Set(
          stepActions.map((a) => (a as any).id).filter(Boolean) as string[]
        );

        const actionIdsToDelete = (existingActions || [])
          .map((a) => a.id)
          .filter((id) => !incomingActionIds.has(id));

        if (actionIdsToDelete.length > 0) {
          // delete child notifications first
          const { error: delNotifsError } = await supabase
            .from('workflow_action_notifications')
            .delete()
            .in('action_id', actionIdsToDelete);
          if (delNotifsError) throw delNotifsError;

          const { error: delActionsError } = await supabase
            .from('workflow_step_actions')
            .delete()
            .in('id', actionIdsToDelete);
          if (delActionsError) throw delActionsError;
        }

        for (const action of stepActions) {
          let actionId = (action as any).id as string | undefined;

          const actionPayload = {
            step_id: stepId,
            action_name: action.action_name,
            action_type: action.action_type,
            next_step_type: (action as any).next_step_type || 'next_step',
            next_step_id: action.next_step_id || null,
            end_state: (action as any).end_state || null,
            is_final_action: action.is_final_action,
            remarks_required: (action as any).remarks_required ?? false,
            result_status: (action as any).result_status || null,
            display_order: action.display_order,
            notification_type: (action as any).notification_type || null,
            notification_module_id: (action as any).notification_module_id || null,
            notification_template_id: (action as any).notification_template_id || null,
          };

          if (actionId) {
            const { error: actionUpsertError } = await supabase
              .from('workflow_step_actions')
              .upsert({ id: actionId, ...actionPayload } as any);
            if (actionUpsertError) throw actionUpsertError;
          } else {
            const { data: insertedAction, error: actionInsertError } = await supabase
              .from('workflow_step_actions')
              .insert(actionPayload as any)
              .select('id')
              .single();

            if (actionInsertError) throw actionInsertError;
            actionId = insertedAction.id;
          }

          // Replace notifications for this action (simple + reliable)
          const { error: deleteExistingNotifsError } = await supabase
            .from('workflow_action_notifications')
            .delete()
            .eq('action_id', actionId);
          if (deleteExistingNotifsError) throw deleteExistingNotifsError;

          if ((action as any).notifications && (action as any).notifications.length > 0) {
            const { error: notifError } = await supabase
              .from('workflow_action_notifications')
              .insert(
                (action as any).notifications.map((n: any) => ({
                  action_id: actionId,
                  notification_type: n.notification_type,
                  template_id: n.template_id,
                }))
              );

            if (notifError) throw notifError;
          }

          // Replace field updates for this action
          const { error: deleteExistingFieldUpdatesError } = await supabase
            .from('workflow_action_field_updates')
            .delete()
            .eq('action_id', actionId);
          if (deleteExistingFieldUpdatesError) throw deleteExistingFieldUpdatesError;

          if ((action as any).fieldUpdates && (action as any).fieldUpdates.length > 0) {
            const { data: user } = await supabase.auth.getUser();
            const { error: fieldUpdateError } = await supabase
              .from('workflow_action_field_updates')
              .insert(
                (action as any).fieldUpdates.map((fu: any, idx: number) => ({
                  action_id: actionId,
                  field_name: fu.field_name,
                  field_value: fu.field_value,
                  display_order: idx,
                  created_by: user.user?.id,
                }))
              );

            if (fieldUpdateError) throw fieldUpdateError;
          }
        }
      }

      return { skippedStepNames };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-with-steps', variables.workflowId] });
      if (result.skippedStepNames.length > 0) {
        toast({
          title: 'Saved with warnings',
          description: `Steps saved successfully. The following steps could not be removed because they are referenced by existing workflow instances: ${result.skippedStepNames.join(', ')}. You can still edit their details.`,
          variant: 'default',
        });
      } else {
        toast({ title: 'Success', description: 'Workflow steps saved successfully' });
      }
    },
    onError: (error: Error, variables) => {
      // Log to system error logs with full context
      logApplicationError(error, {
        module: 'WORKFLOW_MANAGEMENT',
        action: 'save_workflow_steps',
        entity_type: 'workflow',
        entity_id: variables.workflowId,
        request_payload: {
          stepCount: variables.steps.length,
          stepNames: variables.steps.map(s => s.step_name),
        },
      });
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Workflow triggers
export function useWorkflowTriggers() {
  return useQuery({
    queryKey: ['workflow-triggers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_triggers')
        .select(`
          *,
          workflow:workflow_definitions(id, name),
          module:app_modules(id, name, display_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveWorkflowTrigger() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<WorkflowTrigger>) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('workflow_triggers')
        .upsert({
          id: data.id,
          module_id: data.module_id,
          action_name: data.action_name,
          workflow_id: data.workflow_id,
          is_active: data.is_active ?? true,
          created_by: user.user?.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-triggers'] });
      toast({ title: 'Success', description: 'Trigger saved successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteWorkflowTrigger() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workflow_triggers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-triggers'] });
      toast({ title: 'Success', description: 'Trigger deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Workflow tasks
export function useMyWorkflowTasks() {
  return useQuery({
    queryKey: ['my-workflow-tasks'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];
      
      // RLS policy handles role-based filtering
      const { data, error } = await supabase
        .from('workflow_tasks')
        .select(`
          *,
          workflow_instance:workflow_instances(*)
        `)
        .in('status', ['Pending', 'InProgress'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (WorkflowTask & { workflow_instance: WorkflowInstance })[];
    },
  });
}

export function useProcessWorkflowTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      taskId, 
      action, 
      comments 
    }: { 
      taskId: string; 
      action: string; 
      comments?: string 
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.user?.id)
        .single();
      
      // Update task
      const { data: task, error: taskError } = await supabase
        .from('workflow_tasks')
        .update({
          status: 'Completed',
          action_taken: action,
          comments,
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select('*, workflow_instance:workflow_instances(*)')
        .single();
      
      if (taskError) throw taskError;
      
      // Log the action
      await supabase
        .from('workflow_logs')
        .insert({
          instance_id: task.instance_id,
          step_id: task.step_id,
          step_name: task.step_name,
          user_id: user.user?.id,
          user_name: profile?.full_name,
          action,
          old_status: 'InProgress',
          new_status: 'Completed',
          comments,
        });
      
      // Get the current step's action configuration
      const { data: stepAction } = await supabase
        .from('workflow_step_actions')
        .select('*')
        .eq('step_id', task.step_id)
        .eq('action_type', action as any)
        .single();
      
      // Get current step info
      const { data: currentStep } = await supabase
        .from('workflow_steps')
        .select('*')
        .eq('id', task.step_id)
        .single();
      
      // Determine routing based on action configuration
      const nextStepType = (stepAction as any)?.next_step_type || 'next_step';
      const configuredNextStepId = stepAction?.next_step_id;
      const endState = (stepAction as any)?.end_state;
      
      if (nextStepType === 'end_workflow') {
        // End the workflow with specified state
        const finalStatus = endState === 'Rejected' ? 'Rejected' : 'Completed';
        await supabase
          .from('workflow_instances')
          .update({
            status: finalStatus,
            completed_at: new Date().toISOString(),
          })
          .eq('id', task.instance_id);
          
        // Update the source record status if applicable
        const workflowInstance = task.workflow_instance;
        if (workflowInstance?.source_record_id && workflowInstance?.source_module) {
          // Update sample_applications status based on end state
          if (workflowInstance.source_module === 'sample_applications') {
            await supabase
              .from('sample_applications')
              .update({ 
                status: endState === 'Rejected' ? 'Rejected' : 'Approved',
                updated_at: new Date().toISOString()
              })
              .eq('id', workflowInstance.source_record_id);
          }
        }
      } else if (nextStepType === 'send_back_to_applicant') {
        // Put workflow in Query state (awaiting info from applicant)
        const existingMetadata = (task.workflow_instance?.metadata as Record<string, any>) || {};
        await supabase
          .from('workflow_instances')
          .update({
            status: 'Query',
            metadata: {
              ...existingMetadata,
              awaiting_applicant_info: true,
              restart_step_id: configuredNextStepId, // Step to restart from after resubmission
            },
          })
          .eq('id', task.instance_id);
          
        // Update the source record status
        const workflowInstance = task.workflow_instance;
        if (workflowInstance?.source_record_id && workflowInstance?.source_module) {
          if (workflowInstance.source_module === 'sample_applications') {
            await supabase
              .from('sample_applications')
              .update({ 
                status: 'Query' as any, // ProvideInfo state for applicant
                updated_at: new Date().toISOString()
              })
              .eq('id', workflowInstance.source_record_id);
          }
        }
      } else if (nextStepType === 'specific_step' && configuredNextStepId) {
        // Go to specific configured step
        const { data: targetStep } = await supabase
          .from('workflow_steps')
          .select('*')
          .eq('id', configuredNextStepId)
          .single();
        
        if (targetStep) {
          await supabase
            .from('workflow_tasks')
            .insert({
              instance_id: task.instance_id,
              step_id: targetStep.id,
              step_name: targetStep.step_name,
              assigned_role: targetStep.assigned_role,
              assigned_designation: targetStep.assigned_designation,
              status: 'Pending',
              due_at: new Date(Date.now() + targetStep.sla_hours * 60 * 60 * 1000).toISOString(),
            });
          
          await supabase
            .from('workflow_instances')
            .update({ 
              current_step_id: targetStep.id,
              status: 'InProgress'
            })
            .eq('id', task.instance_id);
        }
      } else {
        // Default: next_step - continue to sequential next step
        if (currentStep?.is_final_step) {
          // Complete the workflow
          await supabase
            .from('workflow_instances')
            .update({
              status: 'Completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', task.instance_id);
            
          // Update source record
          const workflowInstance = task.workflow_instance;
          if (workflowInstance?.source_record_id && workflowInstance?.source_module) {
            if (workflowInstance.source_module === 'sample_applications') {
              await supabase
                .from('sample_applications')
                .update({ 
                  status: 'Approved',
                  updated_at: new Date().toISOString()
                })
                .eq('id', workflowInstance.source_record_id);
            }
          }
        } else {
          // Find and create next step task
          const { data: nextStep } = await supabase
            .from('workflow_steps')
            .select('*')
            .eq('workflow_id', (task as any).workflow_instance.workflow_id)
            .eq('step_number', (currentStep?.step_number || 0) + 1)
            .single();
          
          if (nextStep) {
            // Determine task assignment based on approver_type
            const taskAssignment: {
              assigned_role?: string | null;
              assigned_designation?: string | null;
              assigned_to?: string | null;
            } = {};

            const approverType = nextStep.approver_type || 'role';
            
            if (approverType === 'role' && nextStep.approver_role_ids && nextStep.approver_role_ids.length > 0) {
              const roleIds = nextStep.approver_role_ids as string[];
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
            } else if (approverType === 'designation' && nextStep.approver_designation_ids && nextStep.approver_designation_ids.length > 0) {
              const designationIds = nextStep.approver_designation_ids as string[];
              if (designationIds.length === 1) {
                taskAssignment.assigned_designation = designationIds[0];
              }
            } else if ((approverType === 'user' || approverType === 'specific_users') && nextStep.approver_user_ids && nextStep.approver_user_ids.length > 0) {
              const userIds = nextStep.approver_user_ids as string[];
              if (userIds.length === 1) {
                taskAssignment.assigned_to = userIds[0];
              }
            }

            await supabase
              .from('workflow_tasks')
              .insert({
                instance_id: task.instance_id,
                step_id: nextStep.id,
                step_name: nextStep.step_name,
                assigned_role: taskAssignment.assigned_role || null,
                assigned_designation: taskAssignment.assigned_designation || null,
                assigned_to: taskAssignment.assigned_to || null,
                status: 'Pending',
                due_at: new Date(Date.now() + nextStep.sla_hours * 60 * 60 * 1000).toISOString(),
              });
            
            await supabase
              .from('workflow_instances')
              .update({ current_step_id: nextStep.id })
              .eq('id', task.instance_id);
          }
        }
      }
      
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-workflow-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
      queryClient.invalidateQueries({ queryKey: ['sample-applications'] });
      toast({ title: 'Success', description: 'Task processed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Workflow logs
export function useWorkflowLogs(instanceId?: string) {
  return useQuery({
    queryKey: ['workflow-logs', instanceId],
    queryFn: async () => {
      let query = supabase
        .from('workflow_logs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (instanceId) {
        query = query.eq('instance_id', instanceId);
      }
      
      const { data, error } = await query.limit(500);
      
      if (error) throw error;
      return data as WorkflowLog[];
    },
  });
}

// Workflow analytics
export function useWorkflowAnalytics() {
  return useQuery({
    queryKey: ['workflow-analytics'],
    queryFn: async () => {
      const { data: instances, error } = await supabase
        .from('workflow_instances')
        .select('*');
      
      if (error) throw error;
      
      const total = instances?.length || 0;
      const pending = instances?.filter(i => i.status === 'Pending' || i.status === 'InProgress').length || 0;
      const completed = instances?.filter(i => i.status === 'Completed').length || 0;
      const rejected = instances?.filter(i => i.status === 'Rejected').length || 0;
      
      // Calculate SLA violations
      const now = new Date();
      const slaViolations = instances?.filter(i => 
        i.due_at && new Date(i.due_at) < now && i.status !== 'Completed'
      ).length || 0;
      
      // Calculate average completion time
      const completedInstances = instances?.filter(i => i.completed_at) || [];
      const avgCompletionTime = completedInstances.length > 0
        ? completedInstances.reduce((sum, i) => {
            const start = new Date(i.started_at).getTime();
            const end = new Date(i.completed_at!).getTime();
            return sum + (end - start);
          }, 0) / completedInstances.length / (1000 * 60 * 60) // Convert to hours
        : 0;
      
      return {
        total,
        pending,
        completed,
        rejected,
        slaViolations,
        avgCompletionTimeHours: Math.round(avgCompletionTime * 10) / 10,
      };
    },
  });
}

// Start a new workflow instance
export function useStartWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      workflowId,
      sourceModule,
      sourceRecordId,
      sourceRecordName,
      metadata,
    }: {
      workflowId: string;
      sourceModule?: string;
      sourceRecordId?: string;
      sourceRecordName?: string;
      metadata?: Record<string, any>;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.user?.id)
        .single();
      
      // Get workflow and first step
      const { data: workflow } = await supabase
        .from('workflow_definitions')
        .select('*')
        .eq('id', workflowId)
        .single();
      
      if (!workflow) throw new Error('Workflow not found');
      if (!workflow.is_active) throw new Error('Workflow is not active');
      
      const { data: firstStep } = await supabase
        .from('workflow_steps')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('step_number', { ascending: true })
        .limit(1)
        .single();
      
      if (!firstStep) throw new Error('Workflow has no steps');
      
      // Create instance
      const { data: instance, error: instanceError } = await supabase
        .from('workflow_instances')
        .insert({
          workflow_id: workflowId,
          workflow_name: workflow.name,
          source_module: sourceModule,
          source_record_id: sourceRecordId,
          source_record_name: sourceRecordName,
          current_step_id: firstStep.id,
          status: 'InProgress',
          started_by: user.user?.id,
          started_by_name: profile?.full_name,
          due_at: new Date(Date.now() + workflow.default_sla_hours * 60 * 60 * 1000).toISOString(),
          metadata,
        })
        .select()
        .single();
      
      if (instanceError) throw instanceError;
      
      // Create first task - assignment based on approver_type
      const taskAssignment: {
        assigned_role?: string | null;
        assigned_designation?: string | null;
        assigned_to?: string | null;
      } = {};

      const approverType = firstStep.approver_type || 'role';
      
      if (approverType === 'role' && firstStep.approver_role_ids && firstStep.approver_role_ids.length > 0) {
        const roleIds = firstStep.approver_role_ids as string[];
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
        const designationIds = firstStep.approver_designation_ids as string[];
        if (designationIds.length === 1) {
          taskAssignment.assigned_designation = designationIds[0];
        }
      } else if ((approverType === 'user' || approverType === 'specific_users') && firstStep.approver_user_ids && firstStep.approver_user_ids.length > 0) {
        const userIds = firstStep.approver_user_ids as string[];
        if (userIds.length === 1) {
          taskAssignment.assigned_to = userIds[0];
        }
      }

      await supabase
        .from('workflow_tasks')
        .insert({
          instance_id: instance.id,
          step_id: firstStep.id,
          step_name: firstStep.step_name,
          assigned_role: taskAssignment.assigned_role || null,
          assigned_designation: taskAssignment.assigned_designation || null,
          assigned_to: taskAssignment.assigned_to || null,
          status: 'Pending',
          due_at: new Date(Date.now() + firstStep.sla_hours * 60 * 60 * 1000).toISOString(),
        });
      
      // Log start
      await supabase
        .from('workflow_logs')
        .insert({
          instance_id: instance.id,
          step_id: firstStep.id,
          step_name: firstStep.step_name,
          user_id: user.user?.id,
          user_name: profile?.full_name,
          action: 'Started',
          new_status: 'InProgress',
        });
      
      return instance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
      queryClient.invalidateQueries({ queryKey: ['my-workflow-tasks'] });
      toast({ title: 'Success', description: 'Workflow started successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
