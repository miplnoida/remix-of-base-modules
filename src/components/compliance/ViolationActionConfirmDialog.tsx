import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle, RotateCcw, XCircle, ArrowUpCircle } from 'lucide-react';

export type ConfirmActionType = 'escalate' | 'cancel' | 'reopen' | 'start_work' | 'move_to_review' | 'return_to_open' | 'de_escalate';

interface ViolationActionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violationNumber: string;
  actionType: ConfirmActionType;
  onConfirm: (notes: string) => Promise<void>;
}

const ACTION_CONFIG: Record<ConfirmActionType, {
  title: string;
  description: string;
  icon: React.ReactNode;
  buttonLabel: string;
  buttonVariant: 'default' | 'destructive' | 'outline';
  notesRequired: boolean;
  notesPlaceholder: string;
}> = {
  escalate: {
    title: 'Escalate Violation',
    description: 'This will escalate the violation for senior review or legal action. Provide the reason for escalation.',
    icon: <ArrowUpCircle className="h-5 w-5 text-destructive" />,
    buttonLabel: 'Escalate',
    buttonVariant: 'destructive',
    notesRequired: true,
    notesPlaceholder: 'Reason for escalation (e.g., employer non-responsive, repeated offender)...',
  },
  cancel: {
    title: 'Cancel Violation',
    description: 'This will cancel the violation. This action can be reversed by reopening. Provide a cancellation reason.',
    icon: <XCircle className="h-5 w-5 text-destructive" />,
    buttonLabel: 'Cancel Violation',
    buttonVariant: 'destructive',
    notesRequired: true,
    notesPlaceholder: 'Reason for cancellation (e.g., duplicate, created in error)...',
  },
  reopen: {
    title: 'Reopen Violation',
    description: 'This will reopen the violation and return it to OPEN status. Provide the reason for reopening.',
    icon: <RotateCcw className="h-5 w-5 text-primary" />,
    buttonLabel: 'Reopen',
    buttonVariant: 'default',
    notesRequired: true,
    notesPlaceholder: 'Reason for reopening (e.g., new evidence, employer relapsed)...',
  },
  start_work: {
    title: 'Start Work',
    description: 'Mark this violation as In Progress. You are taking active ownership of the case.',
    icon: <AlertTriangle className="h-5 w-5 text-primary" />,
    buttonLabel: 'Start Work',
    buttonVariant: 'default',
    notesRequired: false,
    notesPlaceholder: 'Optional notes on planned approach...',
  },
  move_to_review: {
    title: 'Move to Review',
    description: 'Send this violation for supervisory or peer review before resolution.',
    icon: <AlertTriangle className="h-5 w-5 text-warning" />,
    buttonLabel: 'Move to Review',
    buttonVariant: 'default',
    notesRequired: true,
    notesPlaceholder: 'What should the reviewer focus on?',
  },
  return_to_open: {
    title: 'Return to Open',
    description: 'Return this violation to Open status for further work.',
    icon: <RotateCcw className="h-5 w-5 text-primary" />,
    buttonLabel: 'Return to Open',
    buttonVariant: 'default',
    notesRequired: true,
    notesPlaceholder: 'Reason for returning to open...',
  },
  de_escalate: {
    title: 'De-escalate to Review',
    description: 'Return this escalated violation to review status.',
    icon: <RotateCcw className="h-5 w-5 text-primary" />,
    buttonLabel: 'De-escalate',
    buttonVariant: 'default',
    notesRequired: true,
    notesPlaceholder: 'Reason for de-escalation...',
  },
};

export function ViolationActionConfirmDialog({ open, onOpenChange, violationNumber, actionType, onConfirm }: ViolationActionConfirmDialogProps) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const config = ACTION_CONFIG[actionType];
  const canSubmit = config.notesRequired ? notes.trim().length >= 3 : true;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onConfirm(notes);
      setNotes('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) { if (!v) setNotes(''); onOpenChange(v); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {config.icon}
            {config.title}: {violationNumber}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="action-notes">
              {config.notesRequired ? 'Reason *' : 'Notes (optional)'}
              {config.notesRequired && <span className="text-xs text-muted-foreground ml-1">(min 3 chars)</span>}
            </Label>
            <Textarea
              id="action-notes"
              placeholder={config.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setNotes(''); onOpenChange(false); }} disabled={submitting}>
            Cancel
          </Button>
          <Button variant={config.buttonVariant} onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {config.buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
