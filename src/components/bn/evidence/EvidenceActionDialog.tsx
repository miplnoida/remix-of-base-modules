import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useVerifyEvidence, useRejectEvidence, useWaiveEvidence, useRequestMoreInfo } from '@/hooks/bn/useBnEvidence';
import { useUserCode } from '@/hooks/useUserCode';

type ActionType = 'VERIFY' | 'REJECT' | 'WAIVE' | 'REQUEST_INFO';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: ActionType;
  evidenceId: string;
  documentName: string;
}

const ACTION_CONFIG: Record<ActionType, { title: string; reasonRequired: boolean; authorityRequired: boolean; buttonLabel: string }> = {
  VERIFY: { title: 'Verify Document', reasonRequired: false, authorityRequired: false, buttonLabel: 'Confirm Verification' },
  REJECT: { title: 'Reject Document', reasonRequired: true, authorityRequired: false, buttonLabel: 'Reject Document' },
  WAIVE: { title: 'Waive Document Requirement', reasonRequired: true, authorityRequired: true, buttonLabel: 'Waive Requirement' },
  REQUEST_INFO: { title: 'Request More Information', reasonRequired: true, authorityRequired: false, buttonLabel: 'Send Request' },
};

export function EvidenceActionDialog({ open, onOpenChange, action, evidenceId, documentName }: Props) {
  const { toast } = useToast();
  const { userCode } = useUserCode();
  const [reason, setReason] = useState('');
  const [authorityLevel, setAuthorityLevel] = useState(1);

  const verifyMutation = useVerifyEvidence();
  const rejectMutation = useRejectEvidence();
  const waiveMutation = useWaiveEvidence();
  const requestInfoMutation = useRequestMoreInfo();

  const config = ACTION_CONFIG[action];
  const isPending = verifyMutation.isPending || rejectMutation.isPending || waiveMutation.isPending || requestInfoMutation.isPending;

  const handleSubmit = async () => {
    if (config.reasonRequired && !reason.trim()) {
      toast({ title: 'Reason is required', variant: 'destructive' });
      return;
    }

    const code = userCode || 'SYSTEM';

    try {
      switch (action) {
        case 'VERIFY':
          await verifyMutation.mutateAsync({ evidenceId, userCode: code });
          break;
        case 'REJECT':
          await rejectMutation.mutateAsync({ evidenceId, reason: reason.trim(), userCode: code });
          break;
        case 'WAIVE':
          await waiveMutation.mutateAsync({ evidenceId, reason: reason.trim(), authorityLevel, userCode: code });
          break;
        case 'REQUEST_INFO':
          await requestInfoMutation.mutateAsync({ evidenceId, reason: reason.trim(), userCode: code });
          break;
      }
      toast({ title: `${config.title} completed` });
      onOpenChange(false);
      setReason('');
      setAuthorityLevel(1);
    } catch (err: any) {
      toast({ title: 'Action failed', description: err?.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm font-medium">{documentName}</p>
          </div>

          {config.reasonRequired && (
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)}
                placeholder={action === 'REJECT' ? 'Why is this document being rejected?' : action === 'WAIVE' ? 'Justification for waiving this requirement' : 'What additional information is needed?'}
                rows={3} />
            </div>
          )}

          {config.authorityRequired && (
            <div className="space-y-2">
              <Label>Authority Level</Label>
              <Input type="number" min={1} max={5} value={authorityLevel} onChange={e => setAuthorityLevel(parseInt(e.target.value) || 1)} />
              <p className="text-xs text-muted-foreground">1 = Officer, 2 = Supervisor, 3 = Manager, 4 = Director, 5 = Executive</p>
            </div>
          )}

          {action === 'VERIFY' && (
            <p className="text-sm text-muted-foreground">
              Confirming that this document has been reviewed and meets all requirements.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            variant={action === 'REJECT' ? 'destructive' : 'default'}
          >
            {isPending ? 'Processing...' : config.buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
