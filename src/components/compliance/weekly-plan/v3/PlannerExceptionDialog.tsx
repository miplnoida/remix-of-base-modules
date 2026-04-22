import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertOctagon } from 'lucide-react';
import {
  EXCEPTION_CATEGORY_LABELS,
  type ExceptionCategory,
} from '@/services/plannerCandidateActionsService';

export interface PlannerExceptionPayload {
  category: ExceptionCategory;
  reason: string;
  justification: string;
  approvalRequired: boolean;
  capacityImpactHours: number;
  displacesCandidate: boolean;
  linkedCaseId?: string;
  linkedViolationId?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employerName: string | null;
  onConfirm: (payload: PlannerExceptionPayload) => Promise<void> | void;
}

const CATEGORIES = Object.entries(EXCEPTION_CATEGORY_LABELS) as Array<
  [ExceptionCategory, string]
>;

export function PlannerExceptionDialog({
  open, onOpenChange, employerName, onConfirm,
}: Props) {
  const [category, setCategory] = useState<ExceptionCategory | ''>('');
  const [reason, setReason] = useState('');
  const [justification, setJustification] = useState('');
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [capacityImpactHours, setCapacity] = useState<string>('3');
  const [displaces, setDisplaces] = useState(false);
  const [linkedCaseId, setLinkedCaseId] = useState('');
  const [linkedViolationId, setLinkedViolationId] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setCategory(''); setReason(''); setJustification('');
    setApprovalRequired(false); setCapacity('3'); setDisplaces(false);
    setLinkedCaseId(''); setLinkedViolationId('');
  };

  const submit = async () => {
    if (!category) return;
    if (!reason.trim() || !justification.trim()) return;
    setBusy(true);
    try {
      await onConfirm({
        category: category as ExceptionCategory,
        reason: reason.trim(),
        justification: justification.trim(),
        approvalRequired,
        capacityImpactHours: Number(capacityImpactHours) || 0,
        displacesCandidate: displaces,
        linkedCaseId: linkedCaseId.trim() || undefined,
        linkedViolationId: linkedViolationId.trim() || undefined,
      });
      reset();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-warning" />
            Convert to planner exception
          </DialogTitle>
          <DialogDescription>
            Governed manual work for{' '}
            <span className="font-medium text-foreground">
              {employerName || 'this candidate'}
            </span>
            . Capture category, reason, and justification — this becomes part of
            the weekly plan audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Exception category *</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ExceptionCategory)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Reason (short) *</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Court appearance scheduled"
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Justification narrative *</Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Why this work must be done in this week, and why it is not profile-driven."
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Capacity impact (hours)</Label>
              <Input
                type="number" min={0} step={0.5}
                value={capacityImpactHours}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Displaces a candidate?</Label>
              <div className="h-10 flex items-center">
                <Switch checked={displaces} onCheckedChange={setDisplaces} />
                <span className="ml-2 text-sm text-muted-foreground">
                  {displaces ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Linked case (optional)</Label>
              <Input
                value={linkedCaseId}
                onChange={(e) => setLinkedCaseId(e.target.value)}
                placeholder="Case id"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Linked violation (optional)</Label>
              <Input
                value={linkedViolationId}
                onChange={(e) => setLinkedViolationId(e.target.value)}
                placeholder="Violation id"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-2">
            <div>
              <p className="text-sm font-medium">Approval required</p>
              <p className="text-xs text-muted-foreground">
                Holds the exception in PENDING until a supervisor approves it.
              </p>
            </div>
            <Switch checked={approvalRequired} onCheckedChange={setApprovalRequired} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !category || !reason.trim() || !justification.trim()}>
            {busy ? 'Recording…' : 'Record exception'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
