import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, Play, X, RefreshCw } from 'lucide-react';
import { CancelMeetingDialog } from './CancelMeetingDialog';
import { RescheduleMeetingDialog } from './RescheduleMeetingDialog';
import { useStartMeeting } from '@/hooks/useMeetings';
import type { Meeting, MeetingStatus } from '@/types/meetings';

interface MeetingActionButtonsProps {
  meeting: Meeting;
  onActionComplete?: () => void;
}

// Only show these actions for Scheduled meetings
const actionableStatuses: MeetingStatus[] = ['Scheduled'];

export function MeetingActionButtons({
  meeting,
  onActionComplete,
}: MeetingActionButtonsProps) {
  const navigate = useNavigate();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const startMutation = useStartMeeting();

  // Only show action buttons for scheduled/rescheduled meetings
  if (!actionableStatuses.includes(meeting.status)) {
    return null;
  }

  const handleStartMeeting = async () => {
    try {
      const result = await startMutation.mutateAsync({ meetingId: meeting.id });
      // If a future meeting was auto-rescheduled, navigate to the NEW meeting id
      const targetId = result?.meeting_id || meeting.id;
      navigate(`/meetings/start/${targetId}`);
    } catch (error) {
      console.error('Failed to start meeting:', error);
    }
  };

  const handleActionComplete = () => {
    if (onActionComplete) {
      onActionComplete();
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {/* Start Meeting - Primary action */}
        <Button
          onClick={handleStartMeeting}
          disabled={startMutation.isPending}
          className="gap-2"
        >
          {startMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Start Meeting
        </Button>

        {/* Reschedule Meeting */}
        <Button
          variant="outline"
          onClick={() => setRescheduleDialogOpen(true)}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Reschedule
        </Button>

        {/* Cancel Meeting */}
        <Button
          variant="destructive"
          onClick={() => setCancelDialogOpen(true)}
          className="gap-2"
        >
          <X className="h-4 w-4" />
          Cancel Meeting
        </Button>
      </div>

      {/* Cancel Meeting Dialog */}
      <CancelMeetingDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        meetingId={meeting.id}
        meetingReference={meeting.meeting_reference}
        onSuccess={handleActionComplete}
      />

      {/* Reschedule Meeting Dialog */}
      <RescheduleMeetingDialog
        open={rescheduleDialogOpen}
        onOpenChange={setRescheduleDialogOpen}
        meetingId={meeting.id}
        meetingReference={meeting.meeting_reference}
        currentDate={meeting.meeting_date}
        currentTime={meeting.meeting_time}
        workflowId={meeting.workflow_id}
        workflowInstanceId={meeting.workflow_instance_id}
        stepId={meeting.step_id}
        applicationReference={meeting.application_reference}
        onSuccess={handleActionComplete}
      />
    </>
  );
}
