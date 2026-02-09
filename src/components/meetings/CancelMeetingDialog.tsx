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
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useCancelMeeting } from '@/hooks/useMeetings';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CancelMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
  meetingReference: string;
  onSuccess?: () => void;
}

export function CancelMeetingDialog({
  open,
  onOpenChange,
  meetingId,
  meetingReference,
  onSuccess,
}: CancelMeetingDialogProps) {
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);
  const cancelMutation = useCancelMeeting();

  const handleSubmit = async () => {
    setError(null);
    
    if (!remarks.trim()) {
      setError('Please provide a reason for cancellation');
      return;
    }

    try {
      await cancelMutation.mutateAsync({
        meetingId,
        remarks: remarks.trim(),
      });
      
      onOpenChange(false);
      setRemarks('');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel meeting');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancel Meeting
          </DialogTitle>
          <DialogDescription>
            Cancel meeting <strong>{meetingReference}</strong>. This action will close the current workflow
            instance and create a new one so the review process can restart.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="cancelRemarks">
              Reason for Cancellation <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancelRemarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Please explain why this meeting is being cancelled..."
              rows={4}
              className={!remarks.trim() && error ? 'border-destructive' : ''}
            />
            <p className="text-xs text-muted-foreground">
              This reason will be recorded in the meeting history.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Keep Meeting
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Cancel Meeting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
