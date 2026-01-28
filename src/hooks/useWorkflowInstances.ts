import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkflowInstanceFilters {
  workflowId?: string;
  status?: string;
  initiator?: string;
  applicationId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface WorkflowInstanceWithDetails {
  id: string;
  workflow_id: string;
  workflow_name: string;
  source_module: string | null;
  source_record_id: string | null;
  source_record_name: string | null;
  current_step_id: string | null;
  current_step_name?: string | null;
  status: string;
  started_by: string | null;
  started_by_name: string | null;
  started_at: string;
  completed_at: string | null;
  due_at: string | null;
  metadata: any;
}

export interface WorkflowHistoryEntry {
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
  metadata: any;
  created_at: string;
}

// Fetch all workflow instances with filters and pagination
export function useWorkflowInstances(
  filters: WorkflowInstanceFilters = {},
  page: number = 1,
  pageSize: number = 25
) {
  return useQuery({
    queryKey: ['workflow-instances', filters, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('workflow_instances')
        .select('*', { count: 'exact' });
      
      // Apply filters
      if (filters.workflowId) {
        query = query.eq('workflow_id', filters.workflowId);
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status as any);
      }
      
      if (filters.initiator) {
        query = query.ilike('started_by_name', `%${filters.initiator}%`);
      }

      if (filters.applicationId) {
        query = query.or(`source_record_id.eq.${filters.applicationId},id.eq.${filters.applicationId}`);
      }
      
      if (filters.dateFrom) {
        query = query.gte('started_at', filters.dateFrom);
      }
      
      if (filters.dateTo) {
        query = query.lte('started_at', filters.dateTo + 'T23:59:59');
      }
      
      if (filters.search) {
        query = query.or(`workflow_name.ilike.%${filters.search}%,source_record_name.ilike.%${filters.search}%`);
      }
      
      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      query = query
        .order('started_at', { ascending: false })
        .range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // Fetch current step names
      const instances: WorkflowInstanceWithDetails[] = await Promise.all(
        (data || []).map(async (instance) => {
          let currentStepName = null;
          if (instance.current_step_id) {
            const { data: step } = await supabase
              .from('workflow_steps')
              .select('step_name')
              .eq('id', instance.current_step_id)
              .single();
            currentStepName = step?.step_name;
          }
          return {
            ...instance,
            current_step_name: currentStepName,
          };
        })
      );
      
      return {
        instances,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
  });
}

// Fetch single workflow instance with details
export function useWorkflowInstanceDetail(instanceId: string | null) {
  return useQuery({
    queryKey: ['workflow-instance-detail', instanceId],
    queryFn: async () => {
      if (!instanceId) return null;
      
      const { data: instance, error } = await supabase
        .from('workflow_instances')
        .select('*')
        .eq('id', instanceId)
        .single();
      
      if (error) throw error;
      
      // Get current step name
      let currentStepName = null;
      if (instance.current_step_id) {
        const { data: step } = await supabase
          .from('workflow_steps')
          .select('step_name')
          .eq('id', instance.current_step_id)
          .single();
        currentStepName = step?.step_name;
      }
      
      return {
        ...instance,
        current_step_name: currentStepName,
      } as WorkflowInstanceWithDetails;
    },
    enabled: !!instanceId,
  });
}

// Fetch workflow instance history (logs)
export function useWorkflowInstanceHistory(instanceId: string | null) {
  return useQuery({
    queryKey: ['workflow-instance-history', instanceId],
    queryFn: async () => {
      if (!instanceId) return [];
      
      const { data, error } = await supabase
        .from('workflow_logs')
        .select('*')
        .eq('instance_id', instanceId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      return data as WorkflowHistoryEntry[];
    },
    enabled: !!instanceId,
  });
}

export interface WorkflowTaskWithApproverInfo {
  id: string;
  instance_id: string;
  step_id: string;
  step_name: string;
  status: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  assigned_role: string | null;
  assigned_designation: string | null;
  action_taken: string | null;
  comments: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  due_at: string | null;
  // Step configuration fields
  approver_type: string | null;
  approver_role_names: string[];
  approver_designation_names: string[];
  approver_user_names: string[];
}

// Fetch all tasks for an instance with approver information
export function useWorkflowInstanceTasks(instanceId: string | null) {
  return useQuery({
    queryKey: ['workflow-instance-tasks', instanceId],
    queryFn: async () => {
      if (!instanceId) return [];
      
      // Fetch tasks with step information
      const { data: tasks, error: tasksError } = await supabase
        .from('workflow_tasks')
        .select(`
          *,
          step:workflow_steps!step_id(
            approver_type,
            approver_role_ids,
            approver_designation_ids,
            approver_user_ids,
            assigned_role
          )
        `)
        .eq('instance_id', instanceId)
        .order('created_at', { ascending: true });
      
      if (tasksError) throw tasksError;
      if (!tasks) return [];
      
      // Collect all role/designation/user IDs to resolve names
      const roleIds = new Set<string>();
      const designationIds = new Set<string>();
      const userIds = new Set<string>();
      
      tasks.forEach((task: any) => {
        const step = task.step;
        if (step) {
          if (step.approver_role_ids) {
            step.approver_role_ids.forEach((id: string) => roleIds.add(id));
          }
          if (step.approver_designation_ids) {
            step.approver_designation_ids.forEach((id: string) => designationIds.add(id));
          }
          if (step.approver_user_ids) {
            step.approver_user_ids.forEach((id: string) => userIds.add(id));
          }
        }
      });
      
      // Fetch role names
      let roleMap: Record<string, string> = {};
      if (roleIds.size > 0) {
        const { data: roles } = await supabase
          .from('roles')
          .select('id, role_name')
          .in('id', Array.from(roleIds));
        if (roles) {
          roleMap = Object.fromEntries(roles.map(r => [r.id, r.role_name]));
        }
      }
      
      // Fetch designation names
      let designationMap: Record<string, string> = {};
      if (designationIds.size > 0) {
        const { data: designations } = await supabase
          .from('designations')
          .select('id, name')
          .in('id', Array.from(designationIds));
        if (designations) {
          designationMap = Object.fromEntries(designations.map(d => [d.id, d.name]));
        }
      }
      
      // Fetch user names
      let userMap: Record<string, string> = {};
      if (userIds.size > 0) {
        const { data: users } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(userIds));
        if (users) {
          userMap = Object.fromEntries(users.map(u => [u.id, u.full_name || 'Unknown']));
        }
      }
      
      // Map tasks with resolved approver information
      const enrichedTasks: WorkflowTaskWithApproverInfo[] = tasks.map((task: any) => {
        const step = task.step;
        let approverRoleNames: string[] = [];
        let approverDesignationNames: string[] = [];
        let approverUserNames: string[] = [];
        
        if (step) {
          if (step.approver_role_ids) {
            approverRoleNames = step.approver_role_ids
              .map((id: string) => roleMap[id])
              .filter(Boolean);
          }
          if (step.approver_designation_ids) {
            approverDesignationNames = step.approver_designation_ids
              .map((id: string) => designationMap[id])
              .filter(Boolean);
          }
          if (step.approver_user_ids) {
            approverUserNames = step.approver_user_ids
              .map((id: string) => userMap[id])
              .filter(Boolean);
          }
        }
        
        return {
          id: task.id,
          instance_id: task.instance_id,
          step_id: task.step_id,
          step_name: task.step_name,
          status: task.status,
          assigned_to: task.assigned_to,
          assigned_to_name: task.assigned_to_name,
          assigned_role: task.assigned_role || step?.assigned_role,
          assigned_designation: task.assigned_designation,
          action_taken: task.action_taken,
          comments: task.comments,
          created_at: task.created_at,
          started_at: task.started_at,
          completed_at: task.completed_at,
          due_at: task.due_at,
          approver_type: step?.approver_type || null,
          approver_role_names: approverRoleNames,
          approver_designation_names: approverDesignationNames,
          approver_user_names: approverUserNames,
        };
      });
      
      return enrichedTasks;
    },
    enabled: !!instanceId,
  });
}

// Get unique workflow names for filter dropdown
export function useWorkflowNames() {
  return useQuery({
    queryKey: ['workflow-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_definitions')
        .select('id, name')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      return data || [];
    },
  });
}

// Get workflow instance status options
export function useWorkflowStatusOptions() {
  return ['Pending', 'InProgress', 'Completed', 'Approved', 'Rejected', 'Query', 'Cancelled'];
}
