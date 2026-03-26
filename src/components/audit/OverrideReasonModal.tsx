import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OverrideReasonModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (overrideType: string, reason: string) => void;
  title?: string;
  description?: string;
  overrideTypes?: { value: string; label: string }[];
}

const DEFAULT_OVERRIDE_TYPES = [
  { value: 'add_engagement', label: 'Add Engagement' },
  { value: 'remove_engagement', label: 'Remove Engagement' },
  { value: 'reschedule', label: 'Reschedule' },
  { value: 'change_team', label: 'Change Team Assignment' },
  { value: 'change_risk', label: 'Override Risk Priority' },
];

export function OverrideReasonModal({
  open,
  onClose,
  onConfirm,
  title = 'Override Justification Required',
  description = 'Manual changes to the plan require a documented reason for audit trail compliance.',
  overrideTypes = DEFAULT_OVERRIDE_TYPES,
}: OverrideReasonModalProps) {
  const [overrideType, setOverrideType] = useState(overrideTypes[0]?.value || '');
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(overrideType, reason);
    setReason('');
    setOverrideType(overrideTypes[0]?.value || '');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>

        {overrideTypes.length > 1 && (
          <div className="space-y-2">
            <Label>Override Type</Label>
            <Select value={overrideType} onValueChange={setOverrideType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {overrideTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Justification *</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Provide reason for this manual change..."
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!reason.trim()}>
            Confirm Override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
