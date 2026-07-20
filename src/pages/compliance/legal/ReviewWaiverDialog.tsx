import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useUserCode } from '@/hooks/useUserCode';
import {
  approveWaiver, rejectWaiver, getWaiverDecisions,
} from '@/services/waiverService';

type Waiver = {
  id: string;
  waiver_number: string;
  employer_id: string;
  waiver_type: string;
  status: string;
  amount_requested: number | null;
  amount_approved: number | null;
  reason_code: string | null;
  justification: string | null;
  requested_by: string | null;
  requested_at: string | null;
  approver_comments?: string | null;
  rejected_reason?: string | null;
};

interface Props {
  open: boolean;
  waiver: Waiver | null;
  onClose: () => void;
}

export default function ReviewWaiverDialog({ open, waiver, onClose }: Props) {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [comments, setComments] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    if (waiver) {
      setApprovedAmount(Number(waiver.amount_requested ?? 0));
      setComments('');
      setRejectReason('');
    }
  }, [waiver?.id]);

  const decisionsQ = useQuery({
    queryKey: ['ce_waiver_decisions', waiver?.id],
    queryFn: () => getWaiverDecisions(waiver!.id),
    enabled: !!waiver?.id && open,
  });

  if (!waiver) return null;

  const status = (waiver.status || '').toUpperCase();
  const canDecide = status === 'PENDING' || status === 'PENDING_APPROVAL';

  const handleApprove = async () => {
    try {
      setBusy('approve');
      await approveWaiver({
        waiverId: waiver.id,
        approvedAmount,
        comments: comments || undefined,
        userCode: userCode || 'SYSTEM',
      });
      toast.success('Waiver approved and applied');
      qc.invalidateQueries({ queryKey: ['ce_waivers'] });
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to approve waiver');
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    try {
      setBusy('reject');
      await rejectWaiver({
        waiverId: waiver.id,
        reason: rejectReason,
        comments: comments || undefined,
        userCode: userCode || 'SYSTEM',
      });
      toast.success('Waiver rejected');
      qc.invalidateQueries({ queryKey: ['ce_waivers'] });
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reject waiver');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Review Waiver {waiver.waiver_number}
            <Badge variant="outline">{waiver.waiver_type}</Badge>
            <Badge>{waiver.status}</Badge>
          </DialogTitle>
          <DialogDescription>
            Review the request, then approve with an amount or reject with a reason. All decisions
            are appended to the waiver audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Employer</span><div className="font-mono">{waiver.employer_id}</div></div>
          <div><span className="text-muted-foreground">Requested by</span><div>{waiver.requested_by ?? '—'}</div></div>
          <div><span className="text-muted-foreground">Requested at</span><div>{waiver.requested_at ?? '—'}</div></div>
          <div><span className="text-muted-foreground">Amount requested</span><div>${Number(waiver.amount_requested ?? 0).toLocaleString()}</div></div>
          {waiver.reason_code && (
            <div><span className="text-muted-foreground">Reason</span><div>{waiver.reason_code}</div></div>
          )}
          {waiver.amount_approved != null && (
            <div><span className="text-muted-foreground">Amount approved</span><div>${Number(waiver.amount_approved).toLocaleString()}</div></div>
          )}
        </div>

        {waiver.justification && (
          <div className="text-sm">
            <span className="text-muted-foreground">Justification</span>
            <p className="mt-1">{waiver.justification}</p>
          </div>
        )}

        {canDecide ? (
          <>
            <Separator />
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Approved amount</Label>
                <Input
                  type="number"
                  min={0}
                  max={Number(waiver.amount_requested ?? 0)}
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must be between 0 and requested amount (${Number(waiver.amount_requested ?? 0).toLocaleString()}).
                </p>
              </div>
              <div>
                <Label className="text-xs">Reviewer comments</Label>
                <Textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Rejection reason (required to reject)</Label>
                <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Insufficient evidence" />
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            This waiver is in status <strong>{waiver.status}</strong> and cannot be re-decided.
          </p>
        )}

        <Separator />
        <div>
          <p className="text-xs font-medium mb-2">Decision history</p>
          {decisionsQ.isLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : (decisionsQ.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No decisions yet.</p>
          ) : (
            <ul className="space-y-1 text-xs max-h-40 overflow-auto">
              {(decisionsQ.data ?? []).map((d: any) => (
                <li key={d.id} className="border rounded px-2 py-1">
                  <span className="font-medium">{d.action}</span>{' '}
                  <span className="text-muted-foreground">
                    · {d.from_status ?? '—'} → {d.to_status ?? '—'} · by {d.acted_by} · {d.acted_at}
                  </span>
                  {d.comments && <div className="text-muted-foreground">{d.comments}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {canDecide && (
            <>
              <Button
                variant="destructive"
                disabled={busy !== null || !rejectReason.trim()}
                onClick={handleReject}
              >
                {busy === 'reject' ? 'Rejecting…' : 'Reject'}
              </Button>
              <Button
                disabled={busy !== null || approvedAmount < 0}
                onClick={handleApprove}
              >
                {busy === 'approve' ? 'Approving…' : 'Approve'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
