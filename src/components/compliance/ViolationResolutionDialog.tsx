import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle } from 'lucide-react';

interface ViolationResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violationNumber: string;
  /** 'resolve' = OPEN/IN_PROGRESS/etc → RESOLVED; 'close' = RESOLVED → CLOSED */
  mode: 'resolve' | 'close';
  onConfirm: (data: { resolutionType: string; notes: string; resolutionNotes: string }) => Promise<void>;
}

const RESOLUTION_TYPES = [
  { value: 'PAYMENT_RECEIVED', label: 'Payment Received' },
  { value: 'FILING_SUBMITTED', label: 'Filing Submitted' },
  { value: 'EMPLOYER_COMPLIED', label: 'Employer Complied' },
  { value: 'ARRANGEMENT_ENTERED', label: 'Payment Arrangement Entered' },
  { value: 'DUPLICATE', label: 'Duplicate — Merged with Another' },
  { value: 'ERROR', label: 'Created in Error' },
  { value: 'WAIVED', label: 'Waived / Overridden' },
  { value: 'OTHER', label: 'Other' },
];

export function ViolationResolutionDialog({ open, onOpenChange, violationNumber, mode, onConfirm }: ViolationResolutionDialogProps) {
  const [resolutionType, setResolutionType] = useState('');
  const [notes, setNotes] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isResolve = mode === 'resolve';
  const title = isResolve ? `Resolve Violation ${violationNumber}` : `Close Violation ${violationNumber}`;

  const canSubmit = isResolve
    ? resolutionType && resolutionNotes.trim().length >= 5
    : notes.trim().length >= 5;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onConfirm({ resolutionType, notes, resolutionNotes });
      resetForm();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setResolutionType('');
    setNotes('');
    setResolutionNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) { if (!v) resetForm(); onOpenChange(v); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {isResolve
              ? 'Provide the resolution details. This action marks the violation as resolved and creates an audit record.'
              : 'Provide closure notes. This action finalises the violation as closed.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isResolve && (
            <div className="space-y-2">
              <Label htmlFor="resolution-type">Resolution Type *</Label>
              <Select value={resolutionType} onValueChange={setResolutionType}>
                <SelectTrigger id="resolution-type">
                  <SelectValue placeholder="Select resolution type..." />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTION_TYPES.map(rt => (
                    <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isResolve && (
            <div className="space-y-2">
              <Label htmlFor="resolution-notes">Resolution Notes * <span className="text-xs text-muted-foreground">(min 5 chars)</span></Label>
              <Textarea
                id="resolution-notes"
                placeholder="Describe how this violation was resolved..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="transition-notes">
              {isResolve ? 'Additional Notes' : 'Closure Notes *'}
              {!isResolve && <span className="text-xs text-muted-foreground ml-1">(min 5 chars)</span>}
            </Label>
            <Textarea
              id="transition-notes"
              placeholder={isResolve ? 'Any additional comments...' : 'Provide closure justification...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isResolve ? 'Resolve Violation' : 'Close Violation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
