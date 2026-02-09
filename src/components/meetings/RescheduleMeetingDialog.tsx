import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Clock, Loader2, RefreshCw } from 'lucide-react';
import { useRescheduleMeeting } from '@/hooks/useMeetings';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RescheduleMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
  meetingReference: string;
  currentDate?: string;
  currentTime?: string;
  onSuccess?: () => void;
}

export function RescheduleMeetingDialog({
  open,
  onOpenChange,
  meetingId,
  meetingReference,
  currentDate,
  currentTime,
  onSuccess,
}: RescheduleMeetingDialogProps) {
  const [newDate, setNewDate] = useState<Date | undefined>();
  const [newTime, setNewTime] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const rescheduleMutation = useRescheduleMeeting();

  const handleSubmit = async () => {
    setError(null);

    if (!newDate) {
      setError('Please select a new meeting date');
      return;
    }

    if (!newTime) {
      setError('Please select a new meeting time');
      return;
    }

    if (!remarks.trim()) {
      setError('Please provide a reason for rescheduling');
      return;
    }

    try {
      await rescheduleMutation.mutateAsync({
        meetingId,
        newDate: format(newDate, 'yyyy-MM-dd'),
        newTime,
        remarks: remarks.trim(),
      });

      onOpenChange(false);
      setNewDate(undefined);
      setNewTime('');
      setRemarks('');

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule meeting');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Reschedule Meeting
          </DialogTitle>
          <DialogDescription>
            Reschedule meeting <strong>{meetingReference}</strong>. A new meeting will be
            created with the updated date and time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Current Schedule Info */}
          {(currentDate || currentTime) && (
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-xs text-muted-foreground">Current Schedule</Label>
              <p className="font-medium">
                {currentDate && format(new Date(currentDate), 'PPP')}
                {currentTime && ` at ${currentTime}`}
              </p>
            </div>
          )}

          {/* New Date */}
          <div className="space-y-2">
            <Label>
              New Meeting Date <span className="text-destructive">*</span>
            </Label>
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

          {/* New Time */}
          <div className="space-y-2">
            <Label>
              New Meeting Time <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="time"
                className="pl-10"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="rescheduleRemarks">
              Reason for Rescheduling <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="rescheduleRemarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Please explain why this meeting is being rescheduled..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={rescheduleMutation.isPending}
          >
            {rescheduleMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Reschedule Meeting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
