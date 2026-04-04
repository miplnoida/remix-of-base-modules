import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calculator, RefreshCw, ThumbsUp, CheckCircle, XCircle, FileSearch, ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { DETERMINATION_ACTIONS, type DeterminationAction } from '@/services/bn/determinationService';
import type { EligibilitySnapshot, CalculationSnapshot, EvidenceSummary } from '@/services/bn/determinationService';
import { useBnReasonCodes } from '@/hooks/bn/useBnDecisionEngine';

const iconMap: Record<string, React.ElementType> = {
  Calculator, RefreshCw, ThumbsUp, CheckCircle, XCircle, FileSearch, ShieldAlert,
};

interface Props {
  claimStatus: string;
  eligibility: EligibilitySnapshot[];
  calculations: CalculationSnapshot[];
  evidenceSummary: EvidenceSummary;
  userRoles: string[];
  onAction: (action: string, narrative?: string, reasonCodeId?: string) => void;
  onCalculate: () => void;
  isExecuting: boolean;
}

export const DeterminationActionBar: React.FC<Props> = ({
  claimStatus,
  eligibility,
  calculations,
  evidenceSummary,
  userRoles,
  onAction,
  onCalculate,
  isExecuting,
}) => {
  const [dialogAction, setDialogAction] = useState<DeterminationAction | null>(null);
  const [narrative, setNarrative] = useState('');
  const [selectedReasonCode, setSelectedReasonCode] = useState('');

  const { data: reasonCodes } = useBnReasonCodes(dialogAction?.action);

  const hasEligibility = eligibility.length > 0;
  const eligPassed = eligibility[0]?.overall_result === true || eligibility[0]?.override_applied;
  const hasCalc = calculations.length > 0;
  const isAdmin = userRoles.some(r => r.toLowerCase() === 'admin');
  const isSupervisor = userRoles.some(r => ['supervisor', 'admin'].includes(r.toLowerCase()));

  const checkPreconditions = (action: DeterminationAction): string | null => {
    for (const pre of action.preconditions) {
      if (pre === 'eligibility_checked' && !hasEligibility) return 'Eligibility check required first';
      if (pre === 'has_previous_calculation' && !hasCalc) return 'No previous calculation exists';
      if (pre === 'has_calculation' && !hasCalc) return 'Calculation required first';
      if (pre === 'evidence_complete' && !evidenceSummary.complete) return 'All evidence must be verified';
      if (pre === 'eligibility_passed' && !eligPassed) return 'Eligibility must pass';
      if (pre === 'has_eligibility_check' && !hasEligibility) return 'Eligibility check required';
      if (pre === 'role_supervisor_or_admin' && !isSupervisor) return 'Supervisor or Admin role required';
    }
    return null;
  };

  // Only show actions relevant to determination statuses
  const determinationStatuses = ['ELIGIBILITY_CHECK', 'EVIDENCE_REVIEW', 'CALCULATION', 'DECISION', 'PENDING_INFO'];
  const isInDetermination = determinationStatuses.includes(claimStatus);

  const handleActionClick = (action: DeterminationAction) => {
    if (action.action === 'CALCULATE' || action.action === 'RECALCULATE') {
      onCalculate();
      return;
    }

    if (action.requiresNarrative || action.requiresReasonCode) {
      setDialogAction(action);
      setNarrative('');
      setSelectedReasonCode('');
    } else {
      onAction(action.action);
    }
  };

  const handleConfirm = () => {
    if (!dialogAction) return;
    if (dialogAction.requiresNarrative && !narrative.trim()) {
      toast.error('Narrative is required for this action.');
      return;
    }
    if (dialogAction.requiresReasonCode && !selectedReasonCode) {
      toast.error('Please select a reason code.');
      return;
    }
    onAction(dialogAction.action, narrative, selectedReasonCode || undefined);
    setDialogAction(null);
  };

  if (!isInDetermination && claimStatus !== 'SUBMITTED' && claimStatus !== 'INTAKE_REVIEW') {
    return null;
  }

  return (
    <>
      <div className="sticky bottom-0 z-10 rounded-lg border bg-card p-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-2">Actions:</span>
          {DETERMINATION_ACTIONS.map((action) => {
            const blocked = checkPreconditions(action);
            const Icon = iconMap[action.icon || ''] || Calculator;
            return (
              <Button
                key={action.action}
                variant={action.action === 'APPROVE_READY' ? 'default' : action.action === 'DISALLOW_READY' ? 'destructive' : 'outline'}
                size="sm"
                disabled={!!blocked || isExecuting}
                title={blocked || action.workflowEffect}
                onClick={() => handleActionClick(action)}
              >
                <Icon className="h-3.5 w-3.5 mr-1" />
                {action.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Narrative/Reason Dialog */}
      <Dialog open={!!dialogAction} onOpenChange={() => setDialogAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogAction?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {dialogAction?.requiresReasonCode && (
              <div>
                <Label>Reason Code</Label>
                <Select value={selectedReasonCode} onValueChange={setSelectedReasonCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(reasonCodes ?? []).map((rc: any) => (
                      <SelectItem key={rc.id} value={rc.id}>{rc.reason_name}</SelectItem>
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
            <div className="text-xs text-muted-foreground">
              <strong>Workflow:</strong> {dialogAction?.workflowEffect}
            </div>
            <div className="text-xs text-muted-foreground">
              <strong>Audit:</strong> {dialogAction?.auditEvent}
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
