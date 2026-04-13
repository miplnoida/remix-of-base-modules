import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle } from 'lucide-react';
import { resolveViolation, ResolutionType, RESOLUTION_TYPE_LABELS } from '@/services/violationLifecycleService';
import { toast } from 'sonner';

interface ViolationResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violationId: string;
  violationNumber: string;
  userCode: string;
  onSuccess: () => void;
}

export function ViolationResolutionDialog({
  open, onOpenChange, violationId, violationNumber, userCode, onSuccess,
}: ViolationResolutionDialogProps) {
  const [resolutionType, setResolutionType] = useState<ResolutionType | ''>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!resolutionType) { toast.error('Please select a resolution type'); return; }
    if (!notes.trim()) { toast.error('Resolution notes are required'); return; }

    setSubmitting(true);
    const result = await resolveViolation(violationId, resolutionType, notes.trim(), userCode);
    setSubmitting(false);

    if (result.success) {
      toast.success(`Violation ${violationNumber} resolved`);
      setResolutionType('');
      setNotes('');
      onOpenChange(false);
      onSuccess();
    } else {
      toast.error(result.error || 'Failed to resolve violation');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Resolve Violation
          </DialogTitle>
          <DialogDescription>
            Mark {violationNumber} as resolved. This will stop escalation processing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Resolution Type *</Label>
            <Select value={resolutionType} onValueChange={(v) => setResolutionType(v as ResolutionType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select resolution type..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RESOLUTION_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Resolution Notes *</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe how this violation was resolved..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{notes.length}/500</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !resolutionType || !notes.trim()}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Resolve Violation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
