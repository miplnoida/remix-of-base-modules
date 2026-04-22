// ============================================
// PHASE 3 — Request Revision Dialog
// ============================================
// Lets an inspector request a revision on an APPROVED plan. Backed by
// fn_ce_create_plan_revision via useWeeklyPlanRevision().
//
// Frontend pre-check: before invoking the RPC we fetch the plan family's
// version history and block if any open revision (DRAFT, REVISION_DRAFT,
// SUBMITTED, REVISION_SUBMITTED, REVISION_QUERIED, NEEDS_CHANGES,
// RESUBMITTED) already exists for the same inspector + week. This avoids
// the duplicate "active per week" constraint surfacing as a raw DB error.
// ============================================
import { useState, useMemo } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, GitBranch, AlertTriangle, Ban } from 'lucide-react';
import {
  useWeeklyPlanRevision,
  useRevisionReasons,
  usePlanVersionHistory,
} from '@/hooks/useWeeklyPlanRevision';
import { WeeklyPlanStatus, type WeeklyPlan } from '@/types/weeklyPlan';

interface Props {
  plan: WeeklyPlan | null;
  onClose: () => void;
}

// Statuses considered "open" — a revision in any of these blocks creating a new one.
const OPEN_REVISION_STATUSES = new Set<string>([
  WeeklyPlanStatus.DRAFT,
  WeeklyPlanStatus.REVISION_DRAFT,
  WeeklyPlanStatus.SUBMITTED,
  WeeklyPlanStatus.RESUBMITTED,
  WeeklyPlanStatus.REVISION_SUBMITTED,
  WeeklyPlanStatus.REVISION_QUERIED,
  WeeklyPlanStatus.NEEDS_CHANGES,
  // PENDING_APPROVAL / QUERIED legacy strings (defensive — backend allows them)
  'PENDING_APPROVAL',
  'QUERIED',
]);

export function PlanRevisionDialog({ plan, onClose }: Props) {
  const [reasonCode, setReasonCode] = useState<string>('other');
  const [reasonText, setReasonText] = useState('');
  const { requestRevision } = useWeeklyPlanRevision();
  const { data: reasons = [] } = useRevisionReasons();
  const { data: history = [], isLoading: historyLoading } = usePlanVersionHistory(plan?.id);

  // Detect any sibling in the family for the same week that's still "open".
  const blockingRevision = useMemo(() => {
    if (!plan) return null;
    return (
      history.find(
        (p: any) =>
          p.id !== plan.id &&
          p.week_start_date === plan.week_start_date &&
          OPEN_REVISION_STATUSES.has(p.status),
      ) ?? null
    );
  }, [history, plan]);

  const handleSubmit = () => {
    if (!plan) return;
    if (blockingRevision) return; // guarded by disabled button, defensive
    requestRevision.mutate(
      { planId: plan.id, reasonCode, reasonText },
      {
        onSuccess: () => {
          setReasonText('');
          setReasonCode('other');
          onClose();
        },
      },
    );
  };

  const reasonValid = reasonText.trim().length >= 5 && !!reasonCode;
  const canSubmit = reasonValid && !blockingRevision && !historyLoading;

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

        {/* Pre-check: open revision already exists in this family for the same week */}
        {blockingRevision ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-foreground flex gap-2">
            <Ban className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
            <div>
              A revision is already in progress for this week:{' '}
              <span className="font-semibold">{(blockingRevision as any).plan_number}</span>{' '}
              <span className="text-xs text-muted-foreground">
                (status {(blockingRevision as any).status.replace(/_/g, ' ')})
              </span>
              . Please complete, withdraw, or have it approved/rejected before requesting another
              revision.
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-foreground flex gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
            <div>
              A new <strong>DRAFT</strong> version will be created with all visits cloned. You can
              edit it freely and submit it for approval. Execution data on the original plan is preserved.
            </div>
          </div>
        )}

        <div className="space-y-2 py-2">
          <Label htmlFor="revision-reason-code">
            Reason category <span className="text-destructive">*</span>
          </Label>
          <Select value={reasonCode} onValueChange={setReasonCode} disabled={!!blockingRevision}>
            <SelectTrigger id="revision-reason-code">
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent>
              {reasons.length === 0 ? (
                <SelectItem value="other">Other</SelectItem>
              ) : (
                reasons.map((r: any) => (
                  <SelectItem key={r.reason_code} value={r.reason_code}>
                    {r.reason_label || r.reason_code}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 py-2">
          <Label htmlFor="revision-reason">
            Details <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="revision-reason"
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            placeholder="E.g. Add 2 carry-forward audits, swap Wed slot due to inspector leave..."
            rows={4}
            maxLength={500}
            disabled={!!blockingRevision}
          />
          <p className="text-xs text-muted-foreground">
            {reasonText.trim().length}/500 — minimum 5 characters required.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={requestRevision.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || requestRevision.isPending}>
            {requestRevision.isPending || historyLoading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <GitBranch className="h-4 w-4 mr-1" />
            )}
            {blockingRevision ? 'Revision In Progress' : 'Create Revision Draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
