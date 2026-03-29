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
      const { data, error } = await supabase.functions.invoke('meeting-api-handler', {
        body: {
          action: 'get_meetings',
          filters: {
            status: filters?.status,
            meetingType: filters?.meetingType,
            dateFrom: filters?.dateFrom,
            dateTo: filters?.dateTo
          }
        }
      });

      if (error) throw error;
      
      let meetings: Meeting[] = data?.meetings || [];
      
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
      
      const { data, error } = await supabase.functions.invoke('meeting-api-handler', {
        body: {
          action: 'get_meeting_details',
          meetingId
        }
      });

      if (error) throw error;
      return data as MeetingDetailResponse;
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

// Close meeting with approval (from Start Meeting page)
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
      const { data, error } = await supabase.functions.invoke('meeting-api-handler', {
        body: {
          action: 'close_meeting_approved',
          meetingId,
          applicationData,
          remarks
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Failed to accept application');
      
      return data;
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

// Close meeting with rejection (from Start Meeting page)
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
      const { data, error } = await supabase.functions.invoke('meeting-api-handler', {
        body: {
          action: 'close_meeting_rejected',
          meetingId,
          remarks
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Failed to reject application');
      
      return data;
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
