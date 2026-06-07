/**
 * Generic Override / Approval panel.
 *
 * Drop into any Workbench tab to expose a policy-driven Request → Approve
 * → Apply flow. All gating, required fields, approver role, thresholds and
 * maker-checker are read from `bn_approval_policy` for the supplied area.
 *
 * Usage:
 *   <OverridePanel
 *     area="CALCULATION"
 *     claimId={claim.id}
 *     productVersionId={claim.product_version_id}
 *     userCode={userCode}
 *     userRoles={userRoles}
 *     claimStatus={claim.status}
 *   />
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShieldCheck, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  usePendingOverrides,
  usePolicy,
  useReviewOverride,
  useSubmitOverride,
} from '@/hooks/bn/usePolicy';
import type { PolicyArea } from '@/services/bn/policies/types';
import { formatDateForDisplay } from '@/lib/format-config';

interface Props {
  area: PolicyArea;
  claimId: string;
  productVersionId: string;
  userCode: string;
  userRoles: string[];
  claimStatus?: string;
  applicationChannel?: string;
  /** Optional title override; defaults to area name. */
  title?: string;
}

const AREA_TITLE: Record<PolicyArea, string> = {
  ELIGIBILITY: 'Eligibility Overrides',
  CALCULATION: 'Calculation Overrides',
  DOCUMENTS: 'Document Waivers',
  AMENDMENTS: 'Amendment Overrides',
  PARTICIPANTS: 'Participant Change Overrides',
  WORKFLOW: 'Workflow Overrides',
  AWARD: 'Award Overrides',
  PAYMENT: 'Payment Overrides',
  COMMUNICATION: 'Communication Overrides',
};

export function OverridePanel({
  area,
  claimId,
  productVersionId,
  userCode,
  userRoles,
  claimStatus,
  applicationChannel,
  title,
}: Props) {
  const { data: policy } = usePolicy(productVersionId, area);
  const { data: requests = [] } = usePendingOverrides(claimId, area);
  const submit = useSubmitOverride();
  const review = useReviewOverride(claimId);

  const normalisedRoles = userRoles.map((r) => String(r || '').toUpperCase());
  const requiredApproverRole = policy?.approval_role?.toUpperCase();
  const canApprove = !!policy?.is_enabled && (!requiredApproverRole || normalisedRoles.includes(requiredApproverRole));

  const [open, setOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState('');
  const [justification, setJustification] = useState('');
  const [ruleCode, setRuleCode] = useState('');
  const [amount, setAmount] = useState<string>('');

  if (!policy?.is_enabled) {
    return null; // policy disabled → no UI
  }

  const submitRequest = async () => {
    try {
      await submit.mutateAsync({
        claimId,
        productVersionId,
        area,
        reasonCode: reasonCode || undefined,
        justification: justification || undefined,
        ruleCode: ruleCode || undefined,
        amount: amount ? Number(amount) : undefined,
        claimStatus,
        applicationChannel,
        requestedBy: userCode,
        requestedByRoles: userRoles,
      });
      toast.success('Override request submitted');
      setOpen(false);
      setReasonCode(''); setJustification(''); setRuleCode(''); setAmount('');
    } catch (e: any) {
      toast.error('Could not submit override', { description: e?.message });
    }
  };

  const reviewRequest = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      await review.mutateAsync({
        requestId: id,
        decision,
        reviewedBy: userCode,
        reviewerRoles: userRoles,
      });
      toast.success(`Request ${decision.toLowerCase()}`);
    } catch (e: any) {
      toast.error('Review failed', { description: e?.message });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" /> {title || AREA_TITLE[area]}
        </CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-3 w-3" /> Request Override
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {requests.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No override requests.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requested</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{formatDateForDisplay(r.requested_at)}</TableCell>
                  <TableCell className="text-xs">{r.requested_by}</TableCell>
                  <TableCell className="text-xs">{r.rule_code || '—'}</TableCell>
                  <TableCell className="text-xs">{r.reason_code || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === 'APPROVED' ? 'default' : r.status === 'REJECTED' ? 'destructive' : 'outline'}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === 'PENDING_APPROVAL' && canApprove && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => reviewRequest(r.id, 'APPROVED')}>
                          <CheckCircle2 className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => reviewRequest(r.id, 'REJECTED')}>
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request {AREA_TITLE[area]}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {policy.requires_reason_code && (
              <div>
                <Label>Reason code{policy.reason_code_group && <span className="ml-1 text-xs text-muted-foreground">({policy.reason_code_group})</span>}</Label>
                <Input value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} />
              </div>
            )}
            {(area === 'ELIGIBILITY' || area === 'CALCULATION') && (
              <div>
                <Label>Rule code</Label>
                <Input value={ruleCode} onChange={(e) => setRuleCode(e.target.value)} />
              </div>
            )}
            {(area === 'CALCULATION' || area === 'PAYMENT' || area === 'AWARD') && (
              <div>
                <Label>Amount (optional)</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            )}
            {policy.requires_justification && (
              <div>
                <Label>Justification</Label>
                <Textarea rows={4} value={justification} onChange={(e) => setJustification(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submitRequest} disabled={submit.isPending}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default OverridePanel;
