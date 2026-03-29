import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WorkflowMeetingDepartment {
  id: string;
  workflow_id: string;
  step_id: string;
  action_id: string | null;
  office_code: string;
  department_id: string;
  created_at: string;
  created_by: string | null;
  // Joined fields
  office?: { code: string; description: string; address1: string; address2: string; office_start_time: string; office_end_time: string; office_email: string | null; office_phone: string | null };
  department?: { id: string; name: string };
}

export function useWorkflowMeetingDepartments(workflowId?: string, stepId?: string) {
  return useQuery({
    queryKey: ['workflow-meeting-departments', workflowId, stepId],
    queryFn: async () => {
      let query = (supabase as any)
        .from('workflow_meeting_departments')
        .select(`
          *,
          office:tb_office!workflow_meeting_departments_office_code_fkey(code, description, address1, address2, office_start_time, office_end_time, office_email, office_phone),
          department:tb_office_departments!workflow_meeting_departments_department_id_fkey(id, name)
        `)
        .order('created_at');

      if (workflowId) query = query.eq('workflow_id', workflowId);
      if (stepId) query = query.eq('step_id', stepId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as WorkflowMeetingDepartment[];
    },
    enabled: !!workflowId,
  });
}

export function useAddWorkflowMeetingDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['Workflow', 'meeting_departments', 'create'],
    mutationFn: async (data: {
      workflow_id: string;
      step_id: string;
      action_id?: string;
      office_code: string;
      department_id: string;
      created_by?: string;
    }) => {
      const { data: result, error } = await (supabase as any)
        .from('workflow_meeting_departments')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-meeting-departments'] });
      toast.success('Department added to meeting configuration');
    },
    onError: (error: Error) => {
      if (error.message?.includes('duplicate')) {
        toast.error('This office-department combination already exists');
      } else {
        toast.error(error.message);
      }
    },
  });
}

export function useRemoveWorkflowMeetingDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['Workflow', 'meeting_departments', 'delete'],
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('workflow_meeting_departments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-meeting-departments'] });
      toast.success('Department removed from meeting configuration');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Hook to get meeting departments by workflow (for ScheduleMeetingDialog)
export function useMeetingDepartmentsForWorkflow(workflowId?: string) {
  return useQuery({
    queryKey: ['meeting-departments-for-workflow', workflowId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('workflow_meeting_departments')
        .select(`
          id,
          office_code,
          department_id,
          office:tb_office!workflow_meeting_departments_office_code_fkey(code, description, address1, address2, office_start_time, office_end_time, office_email, office_phone),
          department:tb_office_departments!workflow_meeting_departments_department_id_fkey(id, name)
        `)
        .eq('workflow_id', workflowId)
        .order('office_code');

      if (error) throw error;
      return (data || []) as WorkflowMeetingDepartment[];
    },
    enabled: !!workflowId,
  });
}

// Hook to get users by office and department
export function useUsersForOfficeDepartment(officeCode?: string, departmentId?: string) {
  return useQuery({
    queryKey: ['users-for-office-dept', officeCode, departmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, employee_code, user_code')
        .eq('office_code', officeCode!)
        .eq('department_id', departmentId!)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!officeCode && !!departmentId,
  });
}

// Hook to get user's meetings for a specific date
export function useUserMeetingsForDate(userId?: string, date?: string) {
  return useQuery({
    queryKey: ['user-meetings-for-date', userId, date],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_meetings_for_date', {
        p_user_id: userId!,
        p_date: date!,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId && !!date,
  });
}

// Hook to get user's meetings for a date range (2-week calendar view)
export function useUserMeetingsForDateRange(userId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['user-meetings-date-range', userId, startDate, endDate],
    queryFn: async () => {
      if (!userId || !startDate || !endDate) return [];
      // Query all dates in the range by iterating
      const results: any[] = [];
      const start = new Date(startDate + 'T12:00:00');
      const end = new Date(endDate + 'T12:00:00');
      const promises: Promise<any>[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const p = supabase.rpc('get_user_meetings_for_date', {
          p_user_id: userId,
          p_date: dateStr,
        }).then(({ data }: any) => (data || []).map((m: any) => ({ ...m, date: dateStr }))) as unknown as Promise<any>;
        promises.push(p);
      }
      const allResults = await Promise.all(promises);
      return allResults.flat();
    },
    enabled: !!userId && !!startDate && !!endDate,
    staleTime: 30000,
  });
}

// Hook to check meeting overlap
export function useCheckMeetingOverlap() {
  return useMutation({
    mutationKey: ['Workflow', 'meeting_departments', 'mutation'],
    mutationFn: async (params: {
      assigned_user_id: string;
      meeting_date: string;
      meeting_start_time: string;
      buffer_minutes: number;
      exclude_meeting_id?: string;
    }) => {
      const { data, error } = await supabase.rpc('check_meeting_overlap', {
        p_assigned_user_id: params.assigned_user_id,
        p_meeting_date: params.meeting_date,
        p_meeting_start_time: params.meeting_start_time,
        p_buffer_minutes: params.buffer_minutes,
        p_exclude_meeting_id: params.exclude_meeting_id || null,
      });
      if (error) throw error;
      return data?.[0] || { has_overlap: false };
    },
  });
}

// Hook to validate office hours
export function useValidateOfficeHours() {
  return useMutation({
    mutationKey: ['Workflow', 'meeting_departments', 'mutation'],
    mutationFn: async (params: {
      office_code: string;
      meeting_time: string;
      buffer_minutes: number;
    }) => {
      const { data, error } = await supabase.rpc('validate_meeting_office_hours', {
        p_office_code: params.office_code,
        p_meeting_time: params.meeting_time,
        p_buffer_minutes: params.buffer_minutes,
      });
      if (error) throw error;
      return data?.[0] || { is_valid: true };
    },
  });
}

// Hook to update notify_assigned_person on action config
export function useUpdateMeetingNotifyConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['Workflow', 'meeting_departments', 'update'],
    mutationFn: async ({ configId, notify }: { configId: string; notify: boolean }) => {
      const { data, error } = await (supabase as any)
        .from('workflow_action_configurations')
        .update({ notify_assigned_person: notify })
        .eq('id', configId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-action-configurations'] });
    },
  });
}
