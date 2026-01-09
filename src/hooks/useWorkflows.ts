import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
  next_step_id: string | null;
  is_final_action: boolean;
  display_order: number;
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
          
          // Fetch notifications for each action
          const actionsWithNotifications = await Promise.all(
            (actions || []).map(async (action: WorkflowStepAction) => {
              const { data: notifications } = await supabase
                .from('workflow_action_notifications')
                .select('*')
                .eq('action_id', action.id);
              
              return { ...action, notifications: notifications || [] };
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
          created_by: user.user?.id,
        })
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
        })
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
      // Delete existing steps (cascade will delete actions and notifications)
      await supabase
        .from('workflow_steps')
        .delete()
        .eq('workflow_id', workflowId);
      
      // Insert new steps
      for (const step of steps) {
        const { data: savedStep, error: stepError } = await supabase
          .from('workflow_steps')
          .insert({
            workflow_id: workflowId,
            step_number: step.step_number,
            step_name: step.step_name,
            assigned_role: step.assigned_role,
            assigned_designation: step.assigned_designation,
            action_type: step.action_type,
            sla_hours: step.sla_hours,
            is_final_step: step.is_final_step,
          })
          .select()
          .single();
        
        if (stepError) throw stepError;
        
        // Insert actions for this step
        if (step.actions && step.actions.length > 0) {
          for (const action of step.actions) {
            const { data: savedAction, error: actionError } = await supabase
              .from('workflow_step_actions')
              .insert({
                step_id: savedStep.id,
                action_name: action.action_name,
                action_type: action.action_type,
                is_final_action: action.is_final_action,
                display_order: action.display_order,
              })
              .select()
              .single();
            
            if (actionError) throw actionError;
            
            // Insert notifications for this action
            if (action.notifications && action.notifications.length > 0) {
              const { error: notifError } = await supabase
                .from('workflow_action_notifications')
                .insert(
                  action.notifications.map(n => ({
                    action_id: savedAction.id,
                    notification_type: n.notification_type,
                    template_id: n.template_id,
                  }))
                );
              
              if (notifError) throw notifError;
            }
          }
        }
      }
      
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-with-steps', variables.workflowId] });
      toast({ title: 'Success', description: 'Workflow steps saved successfully' });
    },
    onError: (error: Error) => {
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
      
      const { data, error } = await supabase
        .from('workflow_tasks')
        .select(`
          *,
          workflow_instance:workflow_instances(*)
        `)
        .or(`assigned_to.eq.${user.user.id},status.eq.Pending`)
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
      
      // Handle workflow progression based on action
      if (action === 'Approve' || action === 'AutoApprove') {
        // Find next step
        const { data: currentStep } = await supabase
          .from('workflow_steps')
          .select('*')
          .eq('id', task.step_id)
          .single();
        
        if (currentStep?.is_final_step) {
          // Complete the workflow
          await supabase
            .from('workflow_instances')
            .update({
              status: 'Completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', task.instance_id);
        } else {
          // Find and create next step task
          const { data: nextStep } = await supabase
            .from('workflow_steps')
            .select('*')
            .eq('workflow_id', (task as any).workflow_instance.workflow_id)
            .eq('step_number', (currentStep?.step_number || 0) + 1)
            .single();
          
          if (nextStep) {
            await supabase
              .from('workflow_tasks')
              .insert({
                instance_id: task.instance_id,
                step_id: nextStep.id,
                step_name: nextStep.step_name,
                assigned_role: nextStep.assigned_role,
                assigned_designation: nextStep.assigned_designation,
                status: 'Pending',
                due_at: new Date(Date.now() + nextStep.sla_hours * 60 * 60 * 1000).toISOString(),
              });
            
            await supabase
              .from('workflow_instances')
              .update({ current_step_id: nextStep.id })
              .eq('id', task.instance_id);
          }
        }
      } else if (action === 'Reject') {
        await supabase
          .from('workflow_instances')
          .update({
            status: 'Rejected',
            completed_at: new Date().toISOString(),
          })
          .eq('id', task.instance_id);
      }
      
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-workflow-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
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
      
      // Create first task
      await supabase
        .from('workflow_tasks')
        .insert({
          instance_id: instance.id,
          step_id: firstStep.id,
          step_name: firstStep.step_name,
          assigned_role: firstStep.assigned_role,
          assigned_designation: firstStep.assigned_designation,
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
