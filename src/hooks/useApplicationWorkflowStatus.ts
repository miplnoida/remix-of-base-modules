import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WORKFLOW_CONFIGS, ApplicationType } from './useOnlineApplicationWorkflowBinding';
import { formatDisplayDate, parseDateSafe } from '@/lib/dateFormat';

/**
 * Status information for an application's workflow
 */
export interface ApplicationWorkflowStatus {
  referenceNumber: string;
  workflowInstanceId: string | null;
  workflowStatus: string | null;
  currentStepName: string | null;
  currentStepId: string | null;
  // Meeting information when workflow is awaiting meeting
  meetingId: string | null;
  meetingReference: string | null;
  meetingDate: string | null;
  meetingTime: string | null;
  meetingStatus: string | null;
  // Computed display values
  displayStatus: string;
  displayStatusVariant: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'warning' | 'info' | 'success' | 'error';
  hasMeeting: boolean;
  isMeetingClickable: boolean;
}

/**
 * Map of reference numbers to their workflow status
 */
export type ApplicationWorkflowStatusMap = Record<string, ApplicationWorkflowStatus>;

/**
 * Fetch workflow status for a list of applications
 */
async function fetchWorkflowStatuses(
  referenceNumbers: string[],
  applicationType: ApplicationType
): Promise<ApplicationWorkflowStatusMap> {
  const config = WORKFLOW_CONFIGS[applicationType];
  const statusMap: ApplicationWorkflowStatusMap = {};

  if (referenceNumbers.length === 0) {
    return statusMap;
  }

  // Initialize all with default status
  referenceNumbers.forEach(ref => {
    statusMap[ref] = {
      referenceNumber: ref,
      workflowInstanceId: null,
      workflowStatus: null,
      currentStepName: null,
      currentStepId: null,
      meetingId: null,
      meetingReference: null,
      meetingDate: null,
      meetingTime: null,
      meetingStatus: null,
      displayStatus: 'Pending Review',
      displayStatusVariant: 'pending',
      hasMeeting: false,
      isMeetingClickable: false,
    };
  });

  try {
    // Fetch workflow instances with their current step info
    const { data: instances, error: instancesError } = await supabase
      .from('workflow_instances')
      .select(`
        id,
        source_record_id,
        status,
        current_step_id,
        metadata,
        workflow_steps!workflow_instances_current_step_id_fkey (
          id,
          step_name
        )
      `)
      .eq('source_module', config.sourceModule)
      .in('source_record_id', referenceNumbers);

    if (instancesError) {
      console.error('[ApplicationWorkflowStatus] Error fetching instances:', instancesError);
      return statusMap;
    }

    if (!instances || instances.length === 0) {
      return statusMap;
    }

    // Get instance IDs for meeting lookup
    const instanceIds = instances.map(i => i.id);

    // Fetch active meetings for these workflow instances
    const { data: meetings, error: meetingsError } = await supabase
      .from('meetings')
      .select('id, meeting_reference, workflow_instance_id, meeting_date, meeting_time, status')
      .in('workflow_instance_id', instanceIds)
      .in('status', ['Scheduled', 'Rescheduled', 'InProgress'])
      .order('meeting_date', { ascending: true })
      .order('meeting_time', { ascending: true });

    if (meetingsError) {
      console.error('[ApplicationWorkflowStatus] Error fetching meetings:', meetingsError);
    }

    // Create a map of instance ID to latest active meeting
    const meetingsByInstance: Record<string, typeof meetings extends (infer T)[] ? T : never> = {};
    meetings?.forEach(meeting => {
      if (meeting.workflow_instance_id) {
        // Keep only the earliest scheduled meeting
        if (!meetingsByInstance[meeting.workflow_instance_id]) {
          meetingsByInstance[meeting.workflow_instance_id] = meeting;
        }
      }
    });

    // Process each instance
    instances.forEach(instance => {
      const refNumber = instance.source_record_id;
      if (!refNumber || !statusMap[refNumber]) return;

      const meeting = meetingsByInstance[instance.id];
      const stepName = (instance.workflow_steps as any)?.step_name || null;
      
      // Determine display status based on workflow status and meeting
      let displayStatus = 'Pending Review';
      let displayStatusVariant: ApplicationWorkflowStatus['displayStatusVariant'] = 'pending';
      let hasMeeting = false;
      let isMeetingClickable = false;

      const workflowStatus = instance.status as string;

      if (workflowStatus === 'Approved') {
        displayStatus = 'Approved';
        displayStatusVariant = 'success';
      } else if (workflowStatus === 'Rejected') {
        displayStatus = 'Rejected';
        displayStatusVariant = 'error';
      } else if (workflowStatus === 'Closed' || workflowStatus === 'Completed') {
        displayStatus = 'Closed';
        displayStatusVariant = 'info';
      } else if (workflowStatus === 'AwaitingMeeting' && meeting) {
        // Format meeting date and time
        const meetingDate = meeting.meeting_date;
        const meetingTime = meeting.meeting_time;
        
        if (meetingDate) {
          try {
            const formattedDate = formatDisplayDate(meetingDate);
            
            let timeStr = '';
            if (meetingTime) {
              const timeParts = meetingTime.split(':');
              if (timeParts.length >= 2) {
                const hours = parseInt(timeParts[0]);
                const minutes = timeParts[1];
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const displayHours = hours % 12 || 12;
                timeStr = ` ${displayHours}:${minutes} ${ampm}`;
              }
            }
            
            displayStatus = `Meeting Scheduled – ${formattedDate}${timeStr}`;
          } catch (e) {
            displayStatus = 'Meeting Scheduled';
          }
        } else {
          displayStatus = 'Meeting Scheduled';
        }
        
        displayStatusVariant = 'warning';
        hasMeeting = true;
        isMeetingClickable = true;
      } else if (workflowStatus === 'InProgress') {
        displayStatus = stepName ? `${stepName}` : 'In Progress';
        displayStatusVariant = 'in_progress';
      } else if (workflowStatus === 'Pending') {
        displayStatus = 'Pending Review';
        displayStatusVariant = 'pending';
      }

      statusMap[refNumber] = {
        referenceNumber: refNumber,
        workflowInstanceId: instance.id,
        workflowStatus: workflowStatus,
        currentStepName: stepName,
        currentStepId: instance.current_step_id,
        meetingId: meeting?.id || null,
        meetingReference: meeting?.meeting_reference || null,
        meetingDate: meeting?.meeting_date || null,
        meetingTime: meeting?.meeting_time || null,
        meetingStatus: meeting?.status || null,
        displayStatus,
        displayStatusVariant,
        hasMeeting,
        isMeetingClickable,
      };
    });

    return statusMap;
  } catch (error) {
    console.error('[ApplicationWorkflowStatus] Unexpected error:', error);
    return statusMap;
  }
}

/**
 * Hook to fetch workflow status for a list of applications
 * 
 * @param referenceNumbers - List of application reference numbers
 * @param applicationType - Type of application ('insured-person', 'employer', 'doctor')
 * @param enabled - Whether to enable the query
 */
export function useApplicationWorkflowStatus(
  referenceNumbers: string[],
  applicationType: ApplicationType,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['application-workflow-status', applicationType, referenceNumbers.sort().join(',')],
    queryFn: () => fetchWorkflowStatuses(referenceNumbers, applicationType),
    enabled: enabled && referenceNumbers.length > 0,
    staleTime: 10000, // 10 seconds - refresh quickly after reschedule
    refetchOnWindowFocus: true,
  });
}

/**
 * Get a single application's workflow status from the status map
 */
export function getApplicationWorkflowStatus(
  statusMap: ApplicationWorkflowStatusMap | undefined,
  referenceNumber: string
): ApplicationWorkflowStatus | null {
  if (!statusMap || !referenceNumber) return null;
  return statusMap[referenceNumber] || null;
}
