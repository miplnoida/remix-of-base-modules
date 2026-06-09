import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, FileSearch, ShieldAlert, CornerDownLeft, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { APPROVAL_ACTIONS, APPROVAL_ROLE_MATRIX, type ApprovalAction } from '@/services/bn/approvalConsoleService';
import { useBnReasonCodes } from '@/hooks/bn/useBnDecisionEngine';

const iconMap: Record<string, React.ElementType> = {
  APPROVE: CheckCircle,
  DISALLOW: XCircle,
  REQUEST_EVIDENCE: FileSearch,
  OVERRIDE: ShieldAlert,
  SEND_BACK: CornerDownLeft,
};

interface Props {
  selectedCount: number;
  userRoles: string[];
  currentUserCode: string;
  makerUserCode?: string | null;
  onAction: (action: string, narrative: string, reasonCodeId?: string) => void;
  onBulkApprove: (narrative: string) => void;
  isExecuting: boolean;
}

export const ApprovalActionBar: React.FC<Props> = ({
  selectedCount,
  userRoles,
  currentUserCode,
  makerUserCode,
  onAction,
  onBulkApprove,
  isExecuting,
}) => {
  const [dialogAction, setDialogAction] = useState<ApprovalAction | null>(null);
  const [narrative, setNarrative] = useState('');
  const [reasonCodeId, setReasonCodeId] = useState('');

  const { data: reasonCodes } = useBnReasonCodes(dialogAction?.action);

  // Determine available actions based on role
  const highestRole = userRoles.find(r => APPROVAL_ROLE_MATRIX[r.toUpperCase()]?.canAct) || '';
  const roleConfig = APPROVAL_ROLE_MATRIX[highestRole.toUpperCase()];
  const allowedActions = roleConfig?.actions ?? [];

  // Maker-checker: check if current user is the maker
  const isMaker = makerUserCode && currentUserCode === makerUserCode;
  const isAdmin = userRoles.some(r => r.toLowerCase() === 'admin');

  const filteredActions = APPROVAL_ACTIONS.filter(a => allowedActions.includes(a.action));

  const handleActionClick = (action: ApprovalAction) => {
    if (action.action === 'APPROVE' && selectedCount > 1) {
      // Bulk approve dialog
      setDialogAction(action);
      setNarrative('');
      return;
    }
    setDialogAction(action);
    setNarrative('');
    setReasonCodeId('');
  };

  const handleConfirm = () => {
    if (!dialogAction) return;
    if (dialogAction.requiresNarrative && !narrative.trim()) {
      toast.error('Narrative is required.');
      return;
    }
    if (dialogAction.requiresReasonCode && !reasonCodeId) {
      toast.error('Please select a reason code.');
      return;
    }

    if (dialogAction.action === 'APPROVE' && selectedCount > 1) {
      onBulkApprove(narrative);
    } else {
      onAction(dialogAction.action, narrative, reasonCodeId || undefined);
    }
    setDialogAction(null);
  };

  const isMakerCheckerBlocked = (action: ApprovalAction) => {
    if (!action.preconditions.includes('maker_checker')) return false;
    return isMaker && !isAdmin;
  };

  return (
    <>
      <div className="sticky bottom-0 z-10 rounded-lg border bg-card p-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-2">
            {selectedCount > 0 ? `${selectedCount} selected` : 'Select cases or pick action:'}
          </span>

          {/* Bulk approve */}
          {selectedCount > 1 && allowedActions.includes('APPROVE') && (
            <Button
              size="sm"
              disabled={isExecuting}
              onClick={() => handleActionClick(APPROVAL_ACTIONS.find(a => a.action === 'APPROVE')!)}
            >
              <Layers className="h-3.5 w-3.5 mr-1" />
              Bulk Approve ({selectedCount})
            </Button>
          )}

          {/* Single-case actions */}
          {filteredActions.map((action) => {
            const Icon = iconMap[action.action] || CheckCircle;
            const blocked = isMakerCheckerBlocked(action);
            const tooltip = blocked
              ? 'Self-approval blocked: you submitted this case. A different approver must act on it.'
              : action.entitlementImpact;
            return (
              <Button
                key={action.action}
                variant={action.variant}
                size="sm"
                disabled={isExecuting || blocked || (selectedCount === 0 && action.action !== 'APPROVE')}
                title={tooltip}
                aria-disabled={blocked || undefined}
                onClick={() => handleActionClick(action)}
              >
                <Icon className="h-3.5 w-3.5 mr-1" />
                {action.label}
              </Button>
            );
          })}


          {isMaker && !isAdmin && (
            <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 ml-2">
              Maker-checker: your submission
            </Badge>
          )}
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={!!dialogAction} onOpenChange={() => setDialogAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogAction?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {dialogAction?.requiresReasonCode && (
              <div>
                <Label>Reason Code</Label>
                <Select value={reasonCodeId} onValueChange={setReasonCodeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(reasonCodes ?? []).map((rc: any) => (
                      <SelectItem key={rc.id} value={rc.id}>{rc.reason_label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Narrative / Justification</Label>
              <Textarea
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                placeholder="Enter justification..."
                rows={4}
              />
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p><strong>Workflow:</strong> {dialogAction?.workflowTransition}</p>
              <p><strong>Notification:</strong> {dialogAction?.notificationTrigger || 'None'}</p>
              <p><strong>Entitlement:</strong> {dialogAction?.entitlementImpact}</p>
              <p><strong>Audit:</strong> {dialogAction?.auditEvent}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={isExecuting}>
              Confirm {dialogAction?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
