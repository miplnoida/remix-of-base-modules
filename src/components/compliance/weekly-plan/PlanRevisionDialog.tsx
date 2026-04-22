// ============================================
// PHASE 3 — Request Revision Dialog
// ============================================
// Lets an inspector request a revision on an APPROVED plan. Backed by
// fn_ce_create_plan_revision via useWeeklyPlanRevision().
// ============================================
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, GitBranch, AlertTriangle } from 'lucide-react';
import { useWeeklyPlanRevision } from '@/hooks/useWeeklyPlanRevision';
import type { WeeklyPlan } from '@/types/weeklyPlan';

interface Props {
  plan: WeeklyPlan | null;
  onClose: () => void;
}

export function PlanRevisionDialog({ plan, onClose }: Props) {
  const [reason, setReason] = useState('');
  const { requestRevision } = useWeeklyPlanRevision();

  const handleSubmit = () => {
    if (!plan) return;
    requestRevision.mutate(
      { planId: plan.id, reason },
      {
        onSuccess: () => {
          setReason('');
          onClose();
        },
      },
    );
  };

  const reasonValid = reason.trim().length >= 5;

  return (
    <Dialog open={!!plan} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Request Plan Revision
          </DialogTitle>
          <DialogDescription>
            Create a new draft revision of <span className="font-semibold">{plan?.plan_number}</span>.
            The original approved plan stays intact until the revision is reviewed and approved.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-foreground flex gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
          <div>
            A new <strong>DRAFT</strong> version will be created with all visits cloned. You can
            edit it freely and submit it for approval. Execution data on the original plan is preserved.
          </div>
        </div>

        <div className="space-y-2 py-2">
          <Label htmlFor="revision-reason">
            Reason for revision <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="revision-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="E.g. Add 2 carry-forward audits, swap Wed slot due to inspector leave..."
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">
            {reason.trim().length}/500 — minimum 5 characters required.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={requestRevision.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!reasonValid || requestRevision.isPending}>
            {requestRevision.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <GitBranch className="h-4 w-4 mr-1" />
            )}
            Create Revision Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
