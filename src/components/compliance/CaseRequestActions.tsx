/**
 * Inline action menu for case detail: Request Closure / Reopen / Merge.
 * Gated by manage_compliance permission and feature toggles.
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { PermissionButton } from '@/components/ui/permission-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Lock, Undo2, GitMerge } from 'lucide-react';
import { toast } from 'sonner';
import { useUserCode } from '@/hooks/useUserCode';
import { createCaseRequest, type CaseRequestType } from '@/services/caseRequestsService';
import { isComplianceFeatureEnabled } from '@/lib/compliance/featureToggles';

const MODULE = 'manage_compliance';

interface Props {
  caseId: string;
  caseStatus: string;
  caseNumber: string;
}

export const CaseRequestActions = ({ caseId, caseStatus, caseNumber }: Props) => {
  const { userCode } = useUserCode();
  const [open, setOpen] = useState<CaseRequestType | null>(null);
  const [reason, setReason] = useState('');
  const [targetCaseId, setTargetCaseId] = useState('');

  const closed = ['RESOLVED', 'CLOSED', 'COMPLETED'].includes(caseStatus);

  const mut = useMutation({
    mutationFn: () => createCaseRequest({
      caseId, type: open!, reason,
      targetCaseId: open === 'MERGE' ? targetCaseId : undefined,
      requestedBy: userCode || 'UNKNOWN',
    }),
    onSuccess: () => {
      toast.success(`${open} request submitted for review`);
      setOpen(null); setReason(''); setTargetCaseId('');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to submit request'),
  });

  return (
    <>
      {!closed && isComplianceFeatureEnabled('cases.closure') && (
        <PermissionButton moduleName={MODULE} actionName="edit" size="sm" variant="outline"
          onClick={() => setOpen('CLOSURE')}>
          <Lock className="h-4 w-4 mr-1" />Request Closure
        </PermissionButton>
      )}
      {closed && isComplianceFeatureEnabled('cases.reopenRequests') && (
        <PermissionButton moduleName={MODULE} actionName="edit" size="sm" variant="outline"
          onClick={() => setOpen('REOPEN')}>
          <Undo2 className="h-4 w-4 mr-1" />Request Reopen
        </PermissionButton>
      )}
      {!closed && isComplianceFeatureEnabled('cases.mergeReview') && (
        <PermissionButton moduleName={MODULE} actionName="edit" size="sm" variant="outline"
          onClick={() => setOpen('MERGE')}>
          <GitMerge className="h-4 w-4 mr-1" />Request Merge
        </PermissionButton>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request case {open?.toLowerCase()}</DialogTitle>
            <DialogDescription>Case {caseNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {open === 'MERGE' && (
              <div>
                <label className="text-xs text-muted-foreground">Target case ID (UUID)</label>
                <Input value={targetCaseId} onChange={(e) => setTargetCaseId(e.target.value)}
                  placeholder="UUID of the case to merge into" />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground">Reason (required)</label>
              <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this request is being made…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
            <PermissionButton
              moduleName={MODULE}
              actionName="edit"
              disabled={!reason.trim() || (open === 'MERGE' && !targetCaseId.trim()) || mut.isPending}
              onClick={() => mut.mutate()}
            >
              Submit Request
            </PermissionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
