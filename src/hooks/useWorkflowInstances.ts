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

// Fetch all tasks for an instance
export function useWorkflowInstanceTasks(instanceId: string | null) {
  return useQuery({
    queryKey: ['workflow-instance-tasks', instanceId],
    queryFn: async () => {
      if (!instanceId) return [];
      
      const { data, error } = await supabase
        .from('workflow_tasks')
        .select('*')
        .eq('instance_id', instanceId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      return data;
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
