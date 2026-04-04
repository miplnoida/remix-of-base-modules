/**
 * Payable Detail Drawer — Slide-out view with readiness breakdown, entitlement context,
 * and action execution for single payable instructions.
 */
import React, { useState } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BnStatusBadge, BnDetailRow, BnDetailSection } from '@/components/bn/shared';
import {
  CheckCircle, XCircle, AlertTriangle, Loader2, Banknote,
} from 'lucide-react';
import { useBnPayableDetail, useBnPayableAction } from '@/hooks/bn/useBnPayablesQueue';
import {
  PAYABLE_ACTIONS, READINESS_RULES,
  type PayableAction,
} from '@/services/bn/payablesQueueService';
import { formatDateForDisplay } from '@/lib/format-config';

interface Props {
  instructionId: string | null;
  onClose: () => void;
}

const formatCurrency = (amount: number | null) => {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD' }).format(amount);
};

export const PayableDetailDrawer: React.FC<Props> = ({ instructionId, onClose }) => {
  const { data: payable, isLoading } = useBnPayableDetail(instructionId);
  const actionMutation = useBnPayableAction();

  const [activeAction, setActiveAction] = useState<PayableAction | null>(null);
  const [narrative, setNarrative] = useState('');

  const availableActions = PAYABLE_ACTIONS.filter(a =>
    payable && a.fromStatuses.includes(payable.status as any)
  );

  const handleExecute = () => {
    if (!payable || !activeAction) return;
    actionMutation.mutate({
      instructionId: payable.id,
      action: activeAction.action,
      narrative: narrative || undefined,
      performedBy: 'current-user',
    }, {
      onSuccess: () => {
        setActiveAction(null);
        setNarrative('');
      },
    });
  };

  const readinessFlags = payable?.readiness_flags ?? {};

  return (
    <Sheet open={!!instructionId} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Payable Instruction
          </SheetTitle>
          <SheetDescription>
            Review readiness, status, and execute queue actions
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : payable ? (
          <div className="mt-4 space-y-5">
            {/* Status & Key Info */}
            <div className="flex items-center gap-3">
              <BnStatusBadge status={payable.status} dot />
              <span className="text-xs text-muted-foreground">Age: {payable.age_days}d</span>
              {payable.is_duplicate && (
                <Badge variant="destructive" className="text-[10px]">DUPLICATE</Badge>
              )}
            </div>

            {/* Claim Context */}
            <BnDetailSection title="Claim Context">
              <BnDetailRow label="SSN" value={payable.ssn} />
              <BnDetailRow label="Claim Number" value={payable.claim_number || '—'} />
              <BnDetailRow label="Benefit" value={payable.benefit_name || '—'} />
              <BnDetailRow label="Claim Status" value={payable.claim_status || '—'} />
              <BnDetailRow label="Entitlement" value={payable.entitlement_status || '—'} />
            </BnDetailSection>

            {/* Payment Details */}
            <BnDetailSection title="Payment Details">
              <BnDetailRow label="Type" value={payable.instruction_type} />
              <BnDetailRow label="Amount" value={formatCurrency(payable.amount)} />
              <BnDetailRow label="Payment Method" value={payable.payment_method || '—'} />
              <BnDetailRow label="Payee" value={payable.payee_name || '—'} />
              <BnDetailRow label="Period" value={
                payable.period_start && payable.period_end
                  ? `${formatDateForDisplay(payable.period_start)} — ${formatDateForDisplay(payable.period_end)}`
                  : '—'
              } />
              <BnDetailRow label="Due Date" value={payable.due_date ? formatDateForDisplay(payable.due_date) : '—'} />
              <BnDetailRow label="Scheduled" value={payable.scheduled_date ? formatDateForDisplay(payable.scheduled_date) : '—'} />
            </BnDetailSection>

            {/* Readiness Breakdown */}
            <BnDetailSection title="Readiness Rules">
              <div className="space-y-1.5">
                {READINESS_RULES.map(rule => {
                  const passed = readinessFlags[rule.code] ?? false;
                  return (
                    <div key={rule.code} className="flex items-center gap-2 text-xs">
                      {passed ? (
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      ) : rule.blocking ? (
                        <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      )}
                      <span className={passed ? 'text-muted-foreground' : 'text-foreground font-medium'}>
                        {rule.label}
                      </span>
                      {rule.blocking && !passed && (
                        <Badge variant="destructive" className="text-[9px] ml-auto">BLOCKING</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </BnDetailSection>

            {/* Hold / Exception Info */}
            {payable.hold_reason && (
              <BnDetailSection title="Hold Information">
                <BnDetailRow label="Reason" value={payable.hold_reason} />
                <BnDetailRow label="Held By" value={payable.hold_by || '—'} />
                <BnDetailRow label="Held At" value={payable.hold_at ? formatDateForDisplay(payable.hold_at) : '—'} />
              </BnDetailSection>
            )}

            {payable.exception_detail && (
              <BnDetailSection title="Exception">
                <BnDetailRow label="Code" value={payable.exception_code || '—'} />
                <BnDetailRow label="Detail" value={payable.exception_detail} />
              </BnDetailSection>
            )}

            <Separator />

            {/* Actions */}
            {availableActions.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Actions</h4>
                <div className="flex flex-wrap gap-2">
                  {availableActions.map(a => (
                    <Button
                      key={a.action}
                      variant={a.variant}
                      size="sm"
                      onClick={() => setActiveAction(a)}
                      disabled={actionMutation.isPending}
                    >
                      {a.label}
                    </Button>
                  ))}
                </div>

                {activeAction && (
                  <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
                    <p className="text-sm font-medium">{activeAction.label}</p>
                    <p className="text-xs text-muted-foreground">{activeAction.description}</p>
                    {activeAction.requiresNarrative && (
                      <Textarea
                        placeholder="Provide justification..."
                        value={narrative}
                        onChange={(e) => setNarrative(e.target.value)}
                        rows={3}
                      />
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleExecute} disabled={actionMutation.isPending}>
                        {actionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                        Confirm {activeAction.label}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setActiveAction(null); setNarrative(''); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Payable instruction not found.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
