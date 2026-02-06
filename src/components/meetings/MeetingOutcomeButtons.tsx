import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, CheckCircle, XCircle, RefreshCw, CalendarPlus, Ban } from 'lucide-react';
import { useProcessMeetingOutcome } from '@/hooks/useMeetings';
import type { MeetingOutcome, WorkflowActionOutcome } from '@/types/meetings';

interface MeetingOutcomeButtonsProps {
  meetingId: string;
  outcomes: WorkflowActionOutcome[];
  currentStatus: string;
  onOutcomeProcessed?: () => void;
}

const outcomeIcons: Record<MeetingOutcome, React.ReactNode> = {
  'ClosedWithApproval': <CheckCircle className="h-4 w-4" />,
  'ClosedWithRejection': <XCircle className="h-4 w-4" />,
  'Reschedule': <RefreshCw className="h-4 w-4" />,
  'NextSchedule': <CalendarPlus className="h-4 w-4" />,
  'Cancel': <Ban className="h-4 w-4" />
};

const outcomeVariants: Record<string, "default" | "destructive" | "outline" | "secondary" | "ghost"> = {
  'default': 'default',
  'primary': 'default',
  'success': 'default',
  'danger': 'destructive',
  'destructive': 'destructive',
  'warning': 'secondary',
  'secondary': 'secondary',
  'outline': 'outline'
};

export function MeetingOutcomeButtons({
  meetingId,
  outcomes,
  currentStatus,
  onOutcomeProcessed
}: MeetingOutcomeButtonsProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<WorkflowActionOutcome | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [newDate, setNewDate] = useState<Date | undefined>();
  const [newTime, setNewTime] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  const processOutcome = useProcessMeetingOutcome();

  // Don't show buttons if meeting is already closed/cancelled/rejected
  if (['Closed', 'Cancelled', 'Rejected'].includes(currentStatus)) {
    return null;
  }

  const handleOutcomeClick = (outcome: WorkflowActionOutcome) => {
    setSelectedOutcome(outcome);
    setRemarks('');
    setNewDate(undefined);
    setNewTime('');
    setDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedOutcome) return;

    await processOutcome.mutateAsync({
      meetingId,
      outcome: selectedOutcome.outcome_code,
      remarks: remarks || undefined,
      newDate: newDate ? format(newDate, 'yyyy-MM-dd') : undefined,
      newTime: newTime || undefined
    });

    setDialogOpen(false);
    setSelectedOutcome(null);
    
    if (onOutcomeProcessed) {
      onOutcomeProcessed();
    }
  };

  const needsRescheduleInfo = selectedOutcome?.outcome_code === 'Reschedule';

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {outcomes.map((outcome) => (
          <Button
            key={outcome.id}
            variant={outcomeVariants[outcome.button_variant || 'default']}
            onClick={() => handleOutcomeClick(outcome)}
            className="gap-2"
          >
            {outcomeIcons[outcome.outcome_code]}
            {outcome.outcome_label}
          </Button>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm: {selectedOutcome?.outcome_label}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedOutcome?.description && (
              <p className="text-sm text-muted-foreground">
                {selectedOutcome.description}
              </p>
            )}

            {needsRescheduleInfo && (
              <>
                <div className="space-y-2">
                  <Label>New Meeting Date *</Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !newDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newDate ? format(newDate, 'PPP') : 'Select new date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newDate}
                        onSelect={(date) => {
                          setNewDate(date);
                          setCalendarOpen(false);
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>New Meeting Time</Label>
                  <Input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>
                Remarks {selectedOutcome?.requires_remarks && '*'}
              </Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter any additional notes..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={
                processOutcome.isPending || 
                (selectedOutcome?.requires_remarks && !remarks) ||
                (needsRescheduleInfo && !newDate)
              }
            >
              {processOutcome.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
