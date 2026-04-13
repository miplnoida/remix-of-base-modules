import { useState } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface ViolationActionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  actionLabel: string;
  variant?: 'default' | 'destructive';
  requireReason?: boolean;
  onConfirm: (reason: string) => Promise<void>;
}

export function ViolationActionConfirmDialog({
  open, onOpenChange, title, description, actionLabel, variant = 'default',
  requireReason = false, onConfirm,
}: ViolationActionConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) return;
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {requireReason && (
          <div className="space-y-2 py-2">
            <Label>Reason *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a reason..."
              rows={3}
            />
          </div>
        )}

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
            disabled={submitting || (requireReason && !reason.trim())}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {actionLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
