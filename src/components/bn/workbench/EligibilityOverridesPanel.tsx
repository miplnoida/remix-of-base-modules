/**
 * Eligibility Overrides Panel
 *
 * Lists override requests from bn_override_request (area=ELIGIBILITY) for a
 * claim, grouped by status. Approvers (per policy) can Approve / Reject
 * pending requests; requesters can Cancel their own pending requests.
 * All actions are driven by the unified policy handler.
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Clock, Ban, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  usePendingOverrides,
  useReviewOverride,
  useCancelOverride,
  useRevokeOverride,
} from '@/hooks/bn/usePolicy';
import type { OverrideRequest } from '@/services/bn/policies/types';
import { formatDateForDisplay } from '@/lib/format-config';
import { runClaimEligibility } from '@/services/bn/claimActionRunner';

interface Props {
  claimId: string;
  userCode: string;
  userRoles: string[];
  canReview: boolean;
}

export const EligibilityOverridesPanel: React.FC<Props> = ({ claimId, userCode, userRoles, canReview }) => {
  const { data: rows = [] } = usePendingOverrides(claimId, 'ELIGIBILITY');
  const review = useReviewOverride(claimId);
  const cancel = useCancelOverride(claimId);

  const [reviewing, setReviewing] = useState<{ row: OverrideRequest; decision: 'APPROVED' | 'REJECTED' } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = rows.filter((r) => r.status === 'PENDING_APPROVAL');
  const approved = rows.filter((r) => r.status === 'APPROVED');
  const rejected = rows.filter((r) => r.status === 'REJECTED');
  const cancelled = rows.filter((r) => r.status === 'CANCELLED');

  const submitReview = async () => {
    if (!reviewing) return;
    setBusyId(reviewing.row.id);
    try {
      await review.mutateAsync({
        requestId: reviewing.row.id,
        decision: reviewing.decision,
        notes: reviewNotes || undefined,
        reviewedBy: userCode,
        reviewerRoles: userRoles,
      });
      toast.success(`Override ${reviewing.decision.toLowerCase()}`);
      setReviewing(null);
      setReviewNotes('');
    } catch (err: any) {
      toast.error('Review failed', { description: err?.message });
    } finally {
      setBusyId(null);
    }
  };

  const onCancel = async (row: OverrideRequest) => {
    setBusyId(row.id);
    try {
      await cancel.mutateAsync({ requestId: row.id, cancelledBy: userCode });
      toast.success('Override request cancelled.');
    } catch (err: any) {
      toast.error('Cancel failed', { description: err?.message });
    } finally {
      setBusyId(null);
    }
  };

  if (rows.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Eligibility Overrides</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pending.length > 0 && (
            <Section title="Pending Override Requests" icon={<Clock className="h-4 w-4 text-amber-600" />}>
              {pending.map((r) => (
                <OverrideRow key={r.id} row={r}>
                  <div className="flex gap-2 flex-wrap">
                    {canReview && r.requested_by !== userCode && (
                      <>
                        <Button size="sm" variant="default" disabled={busyId === r.id}
                          onClick={() => { setReviewing({ row: r, decision: 'APPROVED' }); setReviewNotes(''); }}>
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" disabled={busyId === r.id}
                          onClick={() => { setReviewing({ row: r, decision: 'REJECTED' }); setReviewNotes(''); }}>
                          Reject
                        </Button>
                      </>
                    )}
                    {canReview && r.requested_by === userCode && (
                      <Badge variant="outline" className="text-xs">
                        You submitted this — another supervisor must review.
                      </Badge>
                    )}
                    {r.requested_by === userCode && (
                      <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => onCancel(r)}>
                        Cancel my request
                      </Button>
                    )}
                  </div>
                </OverrideRow>
              ))}
            </Section>
          )}

          {approved.length > 0 && (
            <Section title="Approved Overrides" icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}>
              {approved.map((r) => <OverrideRow key={r.id} row={r} />)}
            </Section>
          )}

          {rejected.length > 0 && (
            <Section title="Rejected Overrides" icon={<XCircle className="h-4 w-4 text-destructive" />}>
              {rejected.map((r) => <OverrideRow key={r.id} row={r} />)}
            </Section>
          )}

          {cancelled.length > 0 && (
            <Section title="Cancelled" icon={<Ban className="h-4 w-4 text-muted-foreground" />}>
              {cancelled.map((r) => <OverrideRow key={r.id} row={r} />)}
            </Section>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewing?.decision === 'APPROVED' ? 'Approve Override' : 'Reject Override'}</DialogTitle>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-3 py-2">
              <div className="text-sm">
                Rule <span className="font-mono">{reviewing.row.rule_code ?? '—'}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Requested by {reviewing.row.requested_by} • Reason {reviewing.row.reason_code ?? '—'}
              </div>
              {reviewing.row.justification && (
                <div className="text-sm">{reviewing.row.justification}</div>
              )}
              <Textarea
                rows={3}
                placeholder="Review notes (optional)"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                maxLength={500}
              />
              {reviewing.decision === 'APPROVED' && (
                <p className="text-xs text-amber-700 bg-amber-500/10 border border-amber-300 rounded px-3 py-2">
                  Approving will mark the affected rule as OVERRIDDEN, set eligibility to
                  "Passed with Override" and flag the calculation as stale.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(null)}>Close</Button>
            <Button
              variant={reviewing?.decision === 'APPROVED' ? 'default' : 'destructive'}
              onClick={submitReview}
              disabled={busyId === reviewing?.row.id}
            >
              Confirm {reviewing?.decision === 'APPROVED' ? 'Approval' : 'Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const Section: React.FC<React.PropsWithChildren<{ title: string; icon: React.ReactNode }>> = ({ title, icon, children }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-sm font-medium">
      {icon}
      <span>{title}</span>
    </div>
    <div className="space-y-2">{children}</div>
  </div>
);

const OverrideRow: React.FC<React.PropsWithChildren<{ row: OverrideRequest }>> = ({ row, children }) => {
  const scope = (row.requested_value as any)?.override_scope as string | undefined;
  return (
    <div className="rounded border p-3 text-sm space-y-1">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">{row.rule_code ?? '—'}</Badge>
          {scope && <Badge variant="secondary" className="text-xs">{scope}</Badge>}
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDateForDisplay(row.requested_at)} • by {row.requested_by}
        </span>
      </div>
      <div className="text-xs"><span className="text-muted-foreground">Reason:</span> {row.reason_code ?? '—'}</div>
      {row.justification && <div className="text-xs">{row.justification}</div>}
      {row.reviewed_by && (
        <div className="text-xs text-muted-foreground">
          Reviewed by {row.reviewed_by} on {formatDateForDisplay(row.reviewed_at ?? '')} — {row.review_decision}
          {row.review_notes ? ` — ${row.review_notes}` : ''}
        </div>
      )}
      {children}
    </div>
  );
};
