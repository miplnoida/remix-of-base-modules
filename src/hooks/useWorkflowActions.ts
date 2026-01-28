import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type NextStepType = 'next_step' | 'specific_step' | 'end_workflow' | 'send_back_to_applicant';
export type EndState = 'Approved' | 'Rejected' | null;

export interface WorkflowAction {
  id: string;
  action_name: string;
  action_type: string;
  next_step_id: string | null;
  next_step_type: NextStepType;
  end_state: EndState;
  is_final_action: boolean;
  display_order: number;
}

export interface WorkflowContext {
  hasWorkflow: boolean;
  instanceId: string | null;
  taskId: string | null;
  currentStepId: string | null;
  currentStepName: string | null;
  workflowName: string | null;
  workflowStatus: string | null;
  actions: WorkflowAction[];
  canPerformActions: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

interface WorkflowTask {
  id: string;
  instance_id: string;
  step_id: string;
  step_name: string;
  assigned_to: string | null;
  assigned_role: string | null;
  assigned_designation: string | null;
  status: string;
}

interface WorkflowInstance {
  id: string;
  workflow_id: string;
  workflow_name: string;
  source_module: string;
  source_record_id: string;
  current_step_id: string | null;
  status: string;
}

/**
 * Hook to fetch workflow context for a specific record.
 * Determines if a workflow is attached, the current step, available actions,
 * and whether the current user can perform actions.
 * 
 * @param sourceModule - The module identifier (e.g., 'insured_person_registration')
 * @param sourceRecordId - The unique record identifier (e.g., unique_uuid)
 */
export function useWorkflowActions(
  sourceModule: string,
  sourceRecordId: string | null
): WorkflowContext {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['workflow-actions', sourceModule, sourceRecordId, user?.id],
    queryFn: async (): Promise<Omit<WorkflowContext, 'isLoading' | 'error' | 'refetch'>> => {
      if (!sourceRecordId || !user?.id) {
        return {
          hasWorkflow: false,
          instanceId: null,
          taskId: null,
          currentStepId: null,
          currentStepName: null,
          workflowName: null,
          workflowStatus: null,
          actions: [],
          canPerformActions: false,
        };
      }

      // Step 1: Find workflow instance for this record
      const { data: instances, error: instanceError } = await supabase
        .from('workflow_instances')
        .select('*')
        .eq('source_module', sourceModule)
        .eq('source_record_id', sourceRecordId)
        .not('status', 'in', '("Completed","Rejected","Cancelled")')
        .order('started_at', { ascending: false })
        .limit(1);

      if (instanceError) {
        console.error('Error fetching workflow instance:', instanceError);
        throw instanceError;
      }

      if (!instances || instances.length === 0) {
        // No active workflow for this record
        return {
          hasWorkflow: false,
          instanceId: null,
          taskId: null,
          currentStepId: null,
          currentStepName: null,
          workflowName: null,
          workflowStatus: null,
          actions: [],
          canPerformActions: false,
        };
      }

      const instance = instances[0] as WorkflowInstance;

      // Step 2: Find pending/in-progress task for current step
      const { data: tasks, error: taskError } = await supabase
        .from('workflow_tasks')
        .select('*')
        .eq('instance_id', instance.id)
        .in('status', ['Pending', 'InProgress'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (taskError) {
        console.error('Error fetching workflow task:', taskError);
        throw taskError;
      }

      if (!tasks || tasks.length === 0) {
        // Workflow exists but no active task
        return {
          hasWorkflow: true,
          instanceId: instance.id,
          taskId: null,
          currentStepId: instance.current_step_id,
          currentStepName: null,
          workflowName: instance.workflow_name,
          workflowStatus: instance.status,
          actions: [],
          canPerformActions: false,
        };
      }

      const task = tasks[0] as WorkflowTask;

      // Step 3: Check if current user can perform actions on this task
      // Pass user.role for mock auth compatibility
      const canPerformActions = await checkUserPermission(
        user.id,
        task.assigned_to,
        task.assigned_role,
        task.assigned_designation,
        task.step_id,
        user.role
      );

      // Step 4: If user can perform actions, fetch available actions for the current step
      let actions: WorkflowAction[] = [];
      
      if (canPerformActions) {
        const { data: stepActions, error: actionsError } = await supabase
          .from('workflow_step_actions')
          .select('*')
          .eq('step_id', task.step_id)
          .order('display_order', { ascending: true });

        if (actionsError) {
          console.error('Error fetching step actions:', actionsError);
        } else {
          actions = (stepActions || []).map(a => ({
            id: a.id,
            action_name: a.action_name,
            action_type: a.action_type,
            next_step_id: a.next_step_id,
            next_step_type: a.next_step_type as NextStepType,
            end_state: a.end_state as EndState,
            is_final_action: a.is_final_action,
            display_order: a.display_order,
          }));
        }
      }

      return {
        hasWorkflow: true,
        instanceId: instance.id,
        taskId: task.id,
        currentStepId: task.step_id,
        currentStepName: task.step_name,
        workflowName: instance.workflow_name,
        workflowStatus: instance.status,
        actions,
        canPerformActions,
      };
    },
    enabled: !!sourceRecordId && !!user?.id,
    staleTime: 30000, // 30 seconds
  });

  return {
    hasWorkflow: query.data?.hasWorkflow ?? false,
    instanceId: query.data?.instanceId ?? null,
    taskId: query.data?.taskId ?? null,
    currentStepId: query.data?.currentStepId ?? null,
    currentStepName: query.data?.currentStepName ?? null,
    workflowName: query.data?.workflowName ?? null,
    workflowStatus: query.data?.workflowStatus ?? null,
    actions: query.data?.actions ?? [],
    canPerformActions: query.data?.canPerformActions ?? false,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

/**
 * Check if the user has permission to perform actions on a workflow task.
 * This function supports both database-backed user IDs and mock authentication.
 */
async function checkUserPermission(
  userId: string,
  assignedTo: string | null,
  assignedRole: string | null,
  assignedDesignation: string | null,
  stepId: string,
  userRole?: string
): Promise<boolean> {
  // If task is assigned to this specific user
  if (assignedTo && assignedTo === userId) {
    return true;
  }

  // Get workflow step to check approver configuration
  const { data: step } = await supabase
    .from('workflow_steps')
    .select('approver_type, approver_role_ids, approver_designation_ids, approver_user_ids')
    .eq('id', stepId)
    .single();

  if (!step) {
    // Fallback to task-level assignment
    return await checkTaskLevelAssignment(userId, assignedRole, assignedDesignation, userRole);
  }

  const approverType = step.approver_type;

  // Check based on approver type
  if (approverType === 'user' && step.approver_user_ids) {
    // Check if user is in the allowed users list
    return step.approver_user_ids.includes(userId);
  }

  if (approverType === 'role' && step.approver_role_ids) {
    const allowedRoleIds = step.approver_role_ids as string[];
    
    // First try to get user's roles from database
    const { data: userRoles } = await supabase
      .from('AspNetUserRoles')
      .select('RoleId')
      .eq('UserId', userId);

    if (userRoles && userRoles.length > 0) {
      const userRoleIds = userRoles.map(r => r.RoleId);
      if (allowedRoleIds.some(roleId => userRoleIds.includes(roleId))) {
        return true;
      }
    }

    // If database check fails, try matching by role name (for mock auth)
    if (userRole) {
      // Get role names for the allowed role IDs
      const { data: rolesData } = await supabase
        .from('AspNetRoles')
        .select('Id, Name')
        .in('Id', allowedRoleIds);
      
      if (rolesData) {
        const allowedRoleNames = rolesData.map(r => r.Name.toLowerCase());
        const normalizedUserRole = userRole.toLowerCase().replace(/_/g, ' ');
        
        // Check for matches including partial matches
        // e.g., "admin" matches "Admin", "cashier_supervisor" matches "Cashier Supervisor", "clerk" matches "Clerk"
        if (allowedRoleNames.some(roleName => {
          const normalizedRoleName = roleName.trim();
          const normalizedUser = normalizedUserRole.trim();
          
          return normalizedRoleName === normalizedUser ||
                 normalizedRoleName === userRole.toLowerCase().trim() ||
                 normalizedRoleName.replace(/ /g, '_') === userRole.toLowerCase().trim() ||
                 roleName === userRole.toLowerCase().trim();
        })) {
          return true;
        }
        
        // Special handling for admin role - admins can perform any action
        if (userRole.toLowerCase() === 'admin') {
          return true;
        }
      }
    }
  }

  if (approverType === 'designation' && step.approver_designation_ids) {
    // Get user's designation from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('designation_id')
      .eq('id', userId)
      .single();

    if (profile?.designation_id) {
      const allowedDesignations = step.approver_designation_ids as string[];
      return allowedDesignations.includes(profile.designation_id);
    }
  }

  // Fallback to task-level assignment check
  return await checkTaskLevelAssignment(userId, assignedRole, assignedDesignation, userRole);
}

/**
 * Check task-level role/designation assignment.
 */
async function checkTaskLevelAssignment(
  userId: string,
  assignedRole: string | null,
  assignedDesignation: string | null,
  userRole?: string
): Promise<boolean> {
  // Admin users always have access
  if (userRole?.toLowerCase() === 'admin') {
    return true;
  }
  
  // If no specific assignment, check if user is admin in database
  if (!assignedRole && !assignedDesignation) {
    const { data: userRoles } = await supabase
      .from('AspNetUserRoles')
      .select('RoleId, role:AspNetRoles!AspNetUserRoles_RoleId_fkey(Name)')
      .eq('UserId', userId);

    if (userRoles?.some(r => (r.role as any)?.Name === 'Admin')) {
      return true;
    }
    return false;
  }

  // Check role - compare with both database roles and mock role
  if (assignedRole) {
    // Check mock role match
    if (userRole) {
      const normalizedUserRole = userRole.toLowerCase().replace(/_/g, ' ').trim();
      const normalizedAssignedRole = assignedRole.toLowerCase().replace(/_/g, ' ').trim();
      
      // Direct match
      if (normalizedUserRole === normalizedAssignedRole) {
        return true;
      }
      
      // Case-insensitive match
      if (userRole.toLowerCase() === assignedRole.toLowerCase()) {
        return true;
      }
      
      // Handle common variations (e.g., "clerk" matches "Clerk", "Clerk " matches "clerk")
      if (normalizedUserRole === normalizedAssignedRole || 
          userRole.toLowerCase().trim() === assignedRole.toLowerCase().trim()) {
        return true;
      }
    }
    
    // Check database roles
    const { data: userRoles } = await supabase
      .from('AspNetUserRoles')
      .select('role:AspNetRoles!AspNetUserRoles_RoleId_fkey(Name)')
      .eq('UserId', userId);

    if (userRoles?.some(r => {
      const roleName = (r.role as any)?.Name;
      if (!roleName) return false;
      // Case-insensitive match
      return roleName.toLowerCase() === assignedRole.toLowerCase() ||
             roleName.toLowerCase().trim() === assignedRole.toLowerCase().trim();
    })) {
      return true;
    }
  }

  // Check designation
  if (assignedDesignation) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('designation_id')
      .eq('id', userId)
      .single();

    if (profile?.designation_id === assignedDesignation) {
      return true;
    }
  }

  return false;
}

/**
 * Hook to execute a workflow action.
 */
export function useExecuteWorkflowAction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      taskId,
      actionId,
      comments,
      sourceModule,
      sourceRecordId,
    }: {
      taskId: string;
      actionId: string;
      comments?: string;
      sourceModule: string;
      sourceRecordId: string;
    }) => {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      // Get the action configuration
      const { data: action, error: actionError } = await supabase
        .from('workflow_step_actions')
        .select('*')
        .eq('id', actionId)
        .single();

      if (actionError || !action) {
        throw new Error('Action not found');
      }

      // Get the task
      const { data: task, error: taskError } = await supabase
        .from('workflow_tasks')
        .select('*, workflow_instance:workflow_instances(*)')
        .eq('id', taskId)
        .single();

      if (taskError || !task) {
        throw new Error('Task not found');
      }

      // Update task as completed
      const { error: updateError } = await supabase
        .from('workflow_tasks')
        .update({
          status: 'Completed',
          action_taken: action.action_name,
          comments,
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      // Log the action
      await supabase
        .from('workflow_logs')
        .insert({
          instance_id: task.instance_id,
          step_id: task.step_id,
          step_name: task.step_name,
          action: action.action_name,
          performed_by: user?.id,
          performed_by_name: profile?.full_name || 'System',
          details: comments,
        });

      // Get current step info
      const { data: currentStep } = await supabase
        .from('workflow_steps')
        .select('*')
        .eq('id', task.step_id)
        .single();

      // Handle routing based on action configuration
      const nextStepType = action.next_step_type as NextStepType;
      const endState = action.end_state as EndState;
      const workflowInstance = task.workflow_instance as any;

      if (nextStepType === 'end_workflow') {
        // End the workflow
        const finalStatus = endState === 'Rejected' ? 'Rejected' : 'Completed';
        await supabase
          .from('workflow_instances')
          .update({
            status: finalStatus,
            completed_at: new Date().toISOString(),
          })
          .eq('id', task.instance_id);

        // Update source record status based on module
        await updateSourceRecordStatus(
          sourceModule,
          sourceRecordId,
          endState,
          user?.id,
          comments
        );
      } else if (nextStepType === 'send_back_to_applicant') {
        // Put workflow in Query state
        const existingMetadata = workflowInstance?.metadata || {};
        await supabase
          .from('workflow_instances')
          .update({
            status: 'Query',
            metadata: {
              ...existingMetadata,
              awaiting_applicant_info: true,
              restart_step_id: action.next_step_id,
            },
          })
          .eq('id', task.instance_id);

        // Update source record to Query status
        await updateSourceRecordStatus(
          sourceModule,
          sourceRecordId,
          'Query' as any,
          user?.id,
          comments
        );
      } else if (nextStepType === 'specific_step' && action.next_step_id) {
        // Go to specific step
        await createNextStepTask(task.instance_id, action.next_step_id);
      } else {
        // Default: next sequential step or complete
        if (currentStep?.is_final_step) {
          await supabase
            .from('workflow_instances')
            .update({
              status: 'Completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', task.instance_id);

          await updateSourceRecordStatus(
            sourceModule,
            sourceRecordId,
            'Approved',
            user?.id,
            comments
          );
        } else {
          // Find next step
          const { data: nextStep } = await supabase
            .from('workflow_steps')
            .select('*')
            .eq('workflow_id', workflowInstance?.workflow_id)
            .eq('step_number', (currentStep?.step_number || 0) + 1)
            .single();

          if (nextStep) {
            await createNextStepTask(task.instance_id, nextStep.id);
          }
        }
      }

      return {
        success: true,
        action: action.action_name,
        endState,
      };
    },
    onSuccess: (result, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['workflow-actions', variables.sourceModule, variables.sourceRecordId] });
      queryClient.invalidateQueries({ queryKey: ['ip-records'] });
      queryClient.invalidateQueries({ queryKey: ['applications-for-review'] });
      queryClient.invalidateQueries({ queryKey: ['my-workflow-tasks'] });
      
      toast.success(`Action "${result.action}" executed successfully`);
    },
    onError: (error: Error) => {
      console.error('Workflow action error:', error);
      toast.error(`Failed to execute action: ${error.message}`);
    },
  });
}

/**
 * Create a task for the next step.
 */
async function createNextStepTask(instanceId: string, stepId: string) {
  const { data: step, error: stepError } = await supabase
    .from('workflow_steps')
    .select('*')
    .eq('id', stepId)
    .single();

  if (stepError || !step) {
    throw new Error('Next step not found');
  }

  const dueAt = new Date();
  dueAt.setHours(dueAt.getHours() + (step.sla_hours || 24));

  await supabase
    .from('workflow_tasks')
    .insert({
      instance_id: instanceId,
      step_id: step.id,
      step_name: step.step_name,
      assigned_role: step.assigned_role,
      assigned_designation: step.assigned_designation,
      status: 'Pending',
      due_at: dueAt.toISOString(),
    });

  await supabase
    .from('workflow_instances')
    .update({ 
      current_step_id: step.id,
      status: 'InProgress',
    })
    .eq('id', instanceId);
}

/**
 * Update the source record status based on workflow action result.
 */
async function updateSourceRecordStatus(
  sourceModule: string,
  sourceRecordId: string,
  endState: EndState | 'Query',
  userId?: string,
  comments?: string
) {
  if (sourceModule === 'insured_person_registration') {
    let newStatus: string;
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };

    if (endState === 'Approved') {
      newStatus = 'V'; // Verified
      updateData.status = newStatus;
      updateData.verified_by = userId;
      updateData.date_verified = new Date().toISOString();
    } else if (endState === 'Rejected') {
      newStatus = 'R'; // Rejected
      updateData.status = newStatus;
      updateData.rejected_by = userId;
      updateData.date_rejected = new Date().toISOString();
      updateData.rejection_reason = comments || 'Rejected via workflow';
    } else if (endState === 'Query') {
      newStatus = 'Q'; // Query status (if exists)
      updateData.status = newStatus;
    } else {
      return; // No status update needed
    }

    const { error } = await supabase
      .from('ip_master')
      .update(updateData)
      .eq('unique_uuid', sourceRecordId);

    if (error) {
      console.error('Error updating IP record status:', error);
      throw error;
    }

    // Log audit entry
    await supabase.from('ip_audit_log').insert({
      table_name: 'ip_master',
      record_id: sourceRecordId,
      unique_uuid: sourceRecordId,
      action: endState === 'Approved' ? 'VERIFY' : endState === 'Rejected' ? 'REJECT' : 'QUERY',
      changed_by: userId,
      new_value: newStatus,
      field_name: 'status',
    });
  }
  // Add other module handlers as needed
}
