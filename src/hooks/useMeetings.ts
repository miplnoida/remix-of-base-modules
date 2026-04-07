import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  Meeting,
  MeetingDetailResponse,
  MeetingFilters,
  ScheduleMeetingFormData,
  ProcessOutcomeFormData
} from '@/types/meetings';

// Fetch meetings with filters
export function useMeetings(filters?: MeetingFilters) {
  return useQuery({
    queryKey: ['meetings', filters],
    queryFn: async () => {
      let query = supabase
        .from('meetings')
        .select(`
          *,
          workflow_definitions(name),
          workflow_steps(step_name)
        `)
        .order('meeting_date', { ascending: true })
        .order('meeting_time', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.meetingType) {
        query = query.eq('meeting_type', filters.meetingType);
      }
      if (filters?.dateFrom) {
        query = query.gte('meeting_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('meeting_date', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      let meetings: Meeting[] = (data || []) as unknown as Meeting[];

      // Client-side filtering for reference searches
      if (filters?.applicationReference) {
        meetings = meetings.filter(m =>
          m.application_reference?.toLowerCase().includes(filters.applicationReference!.toLowerCase())
        );
      }
      if (filters?.meetingReference) {
        meetings = meetings.filter(m =>
          m.meeting_reference?.toLowerCase().includes(filters.meetingReference!.toLowerCase())
        );
      }

      return meetings;
    },
    staleTime: 30000
  });
}

// Fetch today's meetings
export function useTodaysMeetings() {
  const today = new Date().toISOString().split('T')[0];
  return useMeetings({ dateFrom: today, dateTo: today });
}

// Fetch single meeting details
export function useMeetingDetails(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['meeting-details', meetingId],
    queryFn: async (): Promise<MeetingDetailResponse> => {
      if (!meetingId) throw new Error('Meeting ID is required');

      // Fetch meeting with joins
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select(`
          *,
          workflow_definitions(name, description),
          workflow_steps(step_name, description),
          workflow_action_configurations(
            meeting_type,
            requires_api_integration
          )
        `)
        .eq('id', meetingId)
        .single();

      if (meetingError) throw meetingError;

      // Fetch history, outcomes, and API logs in parallel
      const [historyResult, outcomesResult, apiLogsResult] = await Promise.all([
        supabase
          .from('meeting_history')
          .select('*')
          .eq('meeting_id', meetingId)
          .order('performed_at', { ascending: false }),
        meeting.action_config_id
          ? supabase
              .from('workflow_action_outcomes')
              .select('*')
              .eq('action_config_id', meeting.action_config_id)
              .eq('is_active', true)
              .order('display_order')
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('meeting_api_logs')
          .select('*')
          .eq('meeting_id', meetingId)
          .order('created_at', { ascending: false }),
      ]);

      return {
        meeting: meeting as unknown as Meeting,
        history: (historyResult.data || []) as any,
        outcomes: (outcomesResult.data || []) as any,
        apiLogs: (apiLogsResult.data || []) as any,
      };
    },
    enabled: !!meetingId,
    staleTime: 10000
  });
}

// Schedule a new meeting
export function useScheduleMeeting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: ['Workflow', 'meetings', 'mutation'],
    mutationFn: async (formData: ScheduleMeetingFormData) => {
      const { data, error } = await supabase.functions.invoke('meeting-api-handler', {
        body: {
          action: 'schedule',
          ...formData
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Failed to schedule meeting');
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['today-meeting-count'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-actions'] });
      queryClient.invalidateQueries({ queryKey: ['my-workflow-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['application-workflow-status'] });
      queryClient.invalidateQueries({ queryKey: ['online-applications'] });
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications'] });
      toast.success(`Meeting scheduled successfully. Reference: ${data.meeting_reference}`);
    },
    onError: (error: Error) => {
      console.error('Schedule meeting error:', error);
      toast.error(error.message || 'Failed to schedule meeting');
    }
  });
}

// Process meeting outcome
export function useProcessMeetingOutcome() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: ['Workflow', 'meetings', 'mutation'],
    mutationFn: async (formData: ProcessOutcomeFormData) => {
      const { data, error } = await supabase.functions.invoke('meeting-api-handler', {
        body: {
          action: 'process_outcome',
          ...formData
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Failed to process outcome');
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-details'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
      queryClient.invalidateQueries({ queryKey: ['application-workflow-status'] });
      queryClient.invalidateQueries({ queryKey: ['online-applications'] });
      toast.success(data.message || 'Meeting outcome processed successfully');
    },
    onError: (error: Error) => {
      console.error('Process outcome error:', error);
      toast.error(error.message || 'Failed to process meeting outcome');
    }
  });
}

// Trigger external API call manually
export function useTriggerMeetingApi() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: ['Workflow', 'meetings', 'mutation'],
    mutationFn: async ({ meetingId, apiConfigId }: { meetingId: string; apiConfigId: string }) => {
      const { data, error } = await supabase.functions.invoke('meeting-api-handler', {
        body: {
          action: 'call_external_api',
          meetingId,
          apiConfigId
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-details'] });
      toast.success('API call triggered successfully');
    },
    onError: (error: Error) => {
      console.error('Trigger API error:', error);
      toast.error(error.message || 'Failed to trigger API call');
    }
  });
}

// Start a meeting (change status to InProgress)
export function useStartMeeting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: ['Workflow', 'meetings', 'status_change'],
    mutationFn: async ({ meetingId }: { meetingId: string }) => {
      const { data, error } = await supabase.functions.invoke('meeting-api-handler', {
        body: {
          action: 'start_meeting',
          meetingId
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Failed to start meeting');
      
      return data as {
        success: boolean;
        message: string;
        meeting_id: string;
        meeting_reference: string;
        original_meeting_id?: string;
        original_meeting_reference?: string;
        auto_rescheduled: boolean;
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-details'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
      queryClient.invalidateQueries({ queryKey: ['application-workflow-status'] });
      if (data.auto_rescheduled) {
        toast.success(data.message || 'Future meeting auto-rescheduled. Starting today\'s meeting now.');
      } else {
        toast.success(data.message || 'Meeting started');
      }
    },
    onError: (error: Error) => {
      console.error('Start meeting error:', error);
      toast.error(error.message || 'Failed to start meeting');
    }
  });
}

// Cancel a meeting
export function useCancelMeeting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: ['Workflow', 'meetings', 'mutation'],
    mutationFn: async ({ meetingId, remarks }: { meetingId: string; remarks: string }) => {
      const { data, error } = await supabase.functions.invoke('meeting-api-handler', {
        body: {
          action: 'cancel_meeting',
          meetingId,
          remarks
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Failed to cancel meeting');
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-details'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-actions'] });
      queryClient.invalidateQueries({ queryKey: ['application-workflow-status'] });
      queryClient.invalidateQueries({ queryKey: ['online-applications'] });
      toast.success(data.message || 'Meeting cancelled. A new workflow has been created.');
    },
    onError: (error: Error) => {
      console.error('Cancel meeting error:', error);
      toast.error(error.message || 'Failed to cancel meeting');
    }
  });
}

// Reschedule a meeting
export function useRescheduleMeeting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: ['Workflow', 'meetings', 'mutation'],
    mutationFn: async ({ 
      meetingId, 
      newDate, 
      newTime, 
      remarks,
      officeCode,
      departmentId,
      assignedUserId,
      contactPerson,
      contactEmail,
      contactPhone,
      officeAddress,
      releasePreviousSlot,
    }: { 
      meetingId: string; 
      newDate: string; 
      newTime: string; 
      remarks: string;
      officeCode?: string;
      departmentId?: string;
      assignedUserId?: string;
      contactPerson?: string;
      contactEmail?: string;
      contactPhone?: string;
      officeAddress?: string;
      /** Server-side slot release control. true = free the old slot, false = keep it blocked. */
      releasePreviousSlot?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('meeting-api-handler', {
        body: {
          action: 'reschedule_meeting',
          meetingId,
          newDate,
          newTime,
          remarks,
          officeCode,
          departmentId,
          assignedUserId,
          contactPerson,
          contactEmail,
          contactPhone,
          officeAddress,
          // Explicit boolean — default to true (release) when not supplied
          releasePreviousSlot: releasePreviousSlot !== false,
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Failed to schedule next meeting');
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-details'] });
      queryClient.invalidateQueries({ queryKey: ['application-workflow-status'] });
      queryClient.invalidateQueries({ queryKey: ['online-applications'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
      queryClient.invalidateQueries({ queryKey: ['related-meetings'] });
      toast.success(data.message || `Next meeting scheduled. New reference: ${data.new_meeting_reference}`);
    },
    onError: (error: Error) => {
      console.error('Schedule next meeting error:', error);
      toast.error(error.message || 'Failed to schedule next meeting');
    }
  });
}

// Close meeting with approval (from Start Meeting page) — direct Supabase queries
export function useCloseMeetingWithApproval() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: ['Workflow', 'meetings', 'approve'],
    mutationFn: async ({ 
      meetingId, 
      applicationData, 
      remarks 
    }: { 
      meetingId: string; 
      applicationData?: Record<string, any>;
      remarks?: string;
    }) => {
      const now = new Date().toISOString();

      // 1. Fetch meeting
      const { data: meeting, error: fetchErr } = await supabase
        .from('meetings')
        .select('*, workflow_instances(id, status)')
        .eq('id', meetingId)
        .single();
      if (fetchErr || !meeting) throw new Error(fetchErr?.message || 'Meeting not found');

      // 2. Update meeting status
      const { error: updateErr } = await supabase
        .from('meetings')
        .update({
          status: 'Closed',
          outcome: 'ClosedWithApproval',
          outcome_remarks: remarks || null,
          closed_at: now,
          updated_at: now,
        })
        .eq('id', meetingId);
      if (updateErr) throw new Error(updateErr.message);

      // 3. Insert meeting history
      await supabase.from('meeting_history').insert({
        meeting_id: meetingId,
        old_status: meeting.status,
        new_status: 'Closed',
        action_taken: 'Closed with Approval',
        outcome: 'ClosedWithApproval',
        remarks: remarks || null,
        performed_at: now,
      });

      // 4. Update workflow instance + tasks if linked
      const workflowInstanceId = meeting.workflow_instance_id;
      if (workflowInstanceId) {
        const { error: wiErr } = await supabase
          .from('workflow_instances')
          .update({ status: 'Approved', completed_at: now })
          .eq('id', workflowInstanceId);
        if (wiErr) console.error('Failed to close workflow instance:', wiErr.message);

        const { error: wtErr } = await supabase
          .from('workflow_tasks')
          .update({ status: 'Completed', completed_at: now })
          .eq('instance_id', workflowInstanceId)
          .in('status', ['Pending', 'InProgress']);
        if (wtErr) console.error('Failed to complete workflow tasks:', wtErr.message);

        // Write workflow audit log
        await supabase.from('workflow_logs').insert({
          instance_id: workflowInstanceId,
          action: 'Approved',
          old_status: 'InProgress',
          new_status: 'Approved',
          user_id: null,
          user_name: 'System',
          comments: remarks || 'Application approved during meeting',
        });
      }

      return { success: true, message: 'Application accepted successfully' };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-details'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-actions'] });
      queryClient.invalidateQueries({ queryKey: ['application-workflow-status'] });
      queryClient.invalidateQueries({ queryKey: ['online-applications'] });
      toast.success(data.message || 'Application accepted successfully');
    },
    onError: (error: Error) => {
      console.error('Close meeting accepted error:', error);
      toast.error(error.message || 'Failed to accept application');
    }
  });
}

// Close meeting with rejection (from Start Meeting page) — direct Supabase queries
export function useCloseMeetingWithRejection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: ['Workflow', 'meetings', 'reject'],
    mutationFn: async ({ 
      meetingId, 
      remarks 
    }: { 
      meetingId: string; 
      remarks: string;
    }) => {
      const now = new Date().toISOString();

      // 1. Fetch meeting
      const { data: meeting, error: fetchErr } = await supabase
        .from('meetings')
        .select('*, workflow_instances(id, status)')
        .eq('id', meetingId)
        .single();
      if (fetchErr || !meeting) throw new Error(fetchErr?.message || 'Meeting not found');

      // 2. Update meeting status
      const { error: updateErr } = await supabase
        .from('meetings')
        .update({
          status: 'Closed',
          outcome: 'ClosedWithRejection',
          outcome_remarks: remarks,
          closed_at: now,
          updated_at: now,
        })
        .eq('id', meetingId);
      if (updateErr) throw new Error(updateErr.message);

      // 3. Insert meeting history
      await supabase.from('meeting_history').insert({
        meeting_id: meetingId,
        old_status: meeting.status,
        new_status: 'Closed',
        action_taken: 'Closed with Rejection',
        outcome: 'ClosedWithRejection',
        remarks,
        performed_at: now,
      });

      // 4. Update workflow instance + tasks if linked
      const workflowInstanceId = meeting.workflow_instance_id;
      if (workflowInstanceId) {
        const { error: wiErr } = await supabase
          .from('workflow_instances')
          .update({ status: 'Rejected', completed_at: now })
          .eq('id', workflowInstanceId);
        if (wiErr) console.error('Failed to reject workflow instance:', wiErr.message);

        const { error: wtErr } = await supabase
          .from('workflow_tasks')
          .update({ status: 'Completed', completed_at: now })
          .eq('instance_id', workflowInstanceId)
          .in('status', ['Pending', 'InProgress']);
        if (wtErr) console.error('Failed to complete workflow tasks:', wtErr.message);

        // Write workflow audit log
        await supabase.from('workflow_logs').insert({
          instance_id: workflowInstanceId,
          action: 'Rejected',
          old_status: 'InProgress',
          new_status: 'Rejected',
          user_id: null,
          user_name: 'System',
          comments: remarks || 'Application rejected during meeting',
        });
      }

      return { success: true, message: 'Application rejected' };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-details'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-actions'] });
      queryClient.invalidateQueries({ queryKey: ['application-workflow-status'] });
      queryClient.invalidateQueries({ queryKey: ['online-applications'] });
      toast.success(data.message || 'Application rejected');
    },
    onError: (error: Error) => {
      console.error('Close meeting rejected error:', error);
      toast.error(error.message || 'Failed to reject application');
    }
  });
}

// Fetch workflow action types
export function useWorkflowActionTypes() {
  return useQuery({
    queryKey: ['workflow-action-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_action_types')
        .select('*')
        .eq('is_active', true)
        .order('type_name');

      if (error) throw error;
      return data;
    },
    staleTime: 60000
  });
}

// Fetch workflow API configurations
export function useWorkflowApiConfigurations() {
  return useQuery({
    queryKey: ['workflow-api-configurations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_api_configurations')
        .select('*')
        .eq('is_active', true)
        .order('config_name');

      if (error) throw error;
      return data;
    },
    staleTime: 60000
  });
}
