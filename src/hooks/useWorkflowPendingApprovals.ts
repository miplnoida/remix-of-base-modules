import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PendingApproval {
  id: string;
  instance_id: string;
  workflow_name: string;
  step_name: string;
  source_record_id: string;
  source_record_name: string;
  source_module: string;
  status: string;
  created_at: string;
  due_at: string | null;
  is_overdue: boolean;
  priority: 'High' | 'Medium' | 'Low';
  assigned_role: string | null;
  assigned_designation: string | null;
  assigned_to: string | null;
  submitter_name: string | null;
}

/**
 * Helper function to calculate priority based on due date
 */
function calculatePriority(dueAt: string | null, createdAt: string): 'High' | 'Medium' | 'Low' {
  if (!dueAt) return 'Medium';
  
  const now = new Date();
  const due = new Date(dueAt);
  const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursUntilDue < 0) return 'High'; // Overdue
  if (hoursUntilDue < 4) return 'High'; // Due within 4 hours
  if (hoursUntilDue < 24) return 'Medium'; // Due within 24 hours
  return 'Low';
}

/**
 * Helper function to format waiting time
 */
export function formatWaitingTime(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  
  return `${hours}h ${minutes}m`;
}

/**
 * Hook to fetch pending workflow approvals for the current user.
 * Filters tasks based on user's role, designation, or direct assignment.
 */
export function useMyPendingApprovals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-pending-approvals', user?.id],
    queryFn: async (): Promise<PendingApproval[]> => {
      if (!user?.id) return [];

      // Get user's roles from database
      const { data: userRolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const userRoleNames = userRolesData?.map(r => r.role as string).filter(Boolean) || [];
      const userRoleIds: string[] = [];
      
      // Also include mock role if set
      if (user.role && !userRoleNames.includes(user.role)) {
        userRoleNames.push(user.role);
      }

      // Get user's designation
      const { data: profile } = await supabase
        .from('profiles')
        .select('designation_id')
        .eq('id', user.id)
        .single();

      const userDesignationId = profile?.designation_id;

      // Fetch all pending/in-progress tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('workflow_tasks')
        .select(`
          id,
          instance_id,
          step_id,
          step_name,
          status,
          created_at,
          due_at,
          assigned_role,
          assigned_designation,
          assigned_to,
          workflow_instance:workflow_instances!workflow_tasks_instance_id_fkey (
            id,
            workflow_name,
            source_module,
            source_record_id,
            source_record_name,
            started_by_name
          )
        `)
        .in('status', ['Pending', 'InProgress'])
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.error('Error fetching workflow tasks:', tasksError);
        throw tasksError;
      }

      if (!tasks || tasks.length === 0) return [];

      // Filter tasks that the current user can act on
      const userTasks: PendingApproval[] = [];

      for (const task of tasks) {
        const instance = task.workflow_instance as any;
        if (!instance) continue;

        let canAct = false;

        // Check direct assignment
        if (task.assigned_to === user.id) {
          canAct = true;
        }

        // Check role assignment
        if (!canAct && task.assigned_role) {
          const normalizedAssignedRole = task.assigned_role.toLowerCase().replace(/_/g, ' ').trim();
          canAct = userRoleNames.some(roleName => {
            const normalizedUserRole = roleName.toLowerCase().replace(/_/g, ' ').trim();
            return normalizedUserRole === normalizedAssignedRole ||
                   roleName.toLowerCase() === task.assigned_role?.toLowerCase();
          });
        }

        // Check designation assignment
        if (!canAct && task.assigned_designation && userDesignationId) {
          canAct = task.assigned_designation === userDesignationId;
        }

        // Check step-level approver configuration
        if (!canAct) {
          const { data: step } = await supabase
            .from('workflow_steps')
            .select('approver_type, approver_role_ids, approver_designation_ids, approver_user_ids')
            .eq('id', task.step_id)
            .single();

          if (step) {
            const approverType = step.approver_type || 'role';

            if ((approverType === 'user' || approverType === 'specific_users') && step.approver_user_ids?.includes(user.id)) {
              canAct = true;
            } else if (approverType === 'role' && step.approver_role_ids) {
              canAct = userRoleIds.some(roleId => step.approver_role_ids?.includes(roleId));
            } else if (approverType === 'designation' && step.approver_designation_ids && userDesignationId) {
              canAct = step.approver_designation_ids.includes(userDesignationId);
            }
          }
        }

        // Admin override
        if (!canAct && (user.role?.toLowerCase() === 'admin' || userRoleNames.some(r => r?.toLowerCase() === 'admin'))) {
          canAct = true;
        }

        if (canAct) {
          const now = new Date();
          const dueAt = task.due_at ? new Date(task.due_at) : null;
          const isOverdue = dueAt ? now > dueAt : false;

          userTasks.push({
            id: task.id,
            instance_id: task.instance_id,
            workflow_name: instance.workflow_name || 'Unknown Workflow',
            step_name: task.step_name,
            source_record_id: instance.source_record_id,
            source_record_name: instance.source_record_name || 'Unknown',
            source_module: instance.source_module,
            status: task.status,
            created_at: task.created_at,
            due_at: task.due_at,
            is_overdue: isOverdue,
            priority: calculatePriority(task.due_at, task.created_at),
            assigned_role: task.assigned_role,
            assigned_designation: task.assigned_designation,
            assigned_to: task.assigned_to,
            submitter_name: instance.started_by_name,
          });
        }
      }

      return userTasks;
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook to get count of pending approvals for badge display
 */
export function usePendingApprovalCount() {
  const { data: approvals = [], isLoading } = useMyPendingApprovals();
  
  return {
    count: approvals.length,
    overdueCount: approvals.filter(a => a.is_overdue).length,
    highPriorityCount: approvals.filter(a => a.priority === 'High').length,
    isLoading,
  };
}

/**
 * Hook to mark approval-related notifications as read
 */
export function useMarkApprovalNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationKey: ['Workflow', 'workflow_approvals', 'update'],
    mutationFn: async (taskId: string) => {
      if (!user?.id) return;

      // Find and mark notifications related to this task as read
      const { error } = await supabase
        .from('in_app_notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
        .like('link', `%${taskId}%`);

      if (error) {
        console.error('Error marking notification as read:', error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications', user?.id] });
    },
  });
}
