/**
 * Schedule Row Drawer — Detail view with row-level actions
 */
import React, { useState } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { BnStatusBadge, BnDetailRow, BnDetailSection } from '@/components/bn/shared';
import { CalendarDays, Loader2 } from 'lucide-react';
import { useBnScheduleRows, useBnScheduleRowAction } from '@/hooks/bn/useBnSchedule';
import {
  SCHEDULE_ACTIONS,
  type ScheduleAction,
} from '@/services/bn/scheduleService';
import { formatDateForDisplay } from '@/lib/format-config';

interface Props {
  rowId: string | null;
  onClose: () => void;
}

const formatCurrency = (amount: number | null) => {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD' }).format(amount);
};

export const ScheduleRowDrawer: React.FC<Props> = ({ rowId, onClose }) => {
  // Fetch the single row from existing query cache if possible
  const { data: allRows } = useBnScheduleRows({});
  const row = allRows?.find(r => r.id === rowId) ?? null;

  const actionMutation = useBnScheduleRowAction();
  const [activeAction, setActiveAction] = useState<ScheduleAction | null>(null);
  const [narrative, setNarrative] = useState('');

  const availableActions = SCHEDULE_ACTIONS.filter(a =>
    a.scope === 'row' && row && a.fromStatuses.includes(row.status as any)
  );

  const handleExecute = () => {
    if (!row || !activeAction) return;
    actionMutation.mutate({
      rowId: row.id,
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

  return (
    <Sheet open={!!rowId} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Schedule Row #{row?.sequence_number ?? ''}
          </SheetTitle>
          <SheetDescription>
            Review schedule row details and execute row-level actions
          </SheetDescription>
        </SheetHeader>

        {row ? (
          <div className="mt-4 space-y-5">
            <div className="flex items-center gap-3">
              <BnStatusBadge status={row.status} dot />
              <span className="text-xs rounded bg-muted px-1.5 py-0.5 uppercase">{row.generation_mode}</span>
              <span className="text-xs rounded bg-muted px-1.5 py-0.5">{row.frequency}</span>
            </div>

            <BnDetailSection title="Claim Context">
              <BnDetailRow label="SSN" value={row.ssn} />
              <BnDetailRow label="Claim Number" value={row.claim_number || '—'} />
              <BnDetailRow label="Benefit" value={row.benefit_name || '—'} />
              <BnDetailRow label="Claim Status" value={row.claim_status || '—'} />
              <BnDetailRow label="Entitlement" value={row.entitlement_status || '—'} />
            </BnDetailSection>

            <BnDetailSection title="Schedule Details">
              <BnDetailRow label="Sequence" value={`#${row.sequence_number}`} />
              <BnDetailRow label="Period" value={`${formatDateForDisplay(row.period_start)} — ${formatDateForDisplay(row.period_end)}`} />
              <BnDetailRow label="Due Date" value={formatDateForDisplay(row.due_date)} />
              <BnDetailRow label="Amount" value={formatCurrency(row.amount)} />
              <BnDetailRow label="Rate Applied" value={formatCurrency(row.rate_applied)} />
              <BnDetailRow label="Weekly Rate" value={row.rate_weekly != null ? formatCurrency(row.rate_weekly) : '—'} />
              <BnDetailRow label="Monthly Rate" value={row.rate_monthly != null ? formatCurrency(row.rate_monthly) : '—'} />
            </BnDetailSection>

            <BnDetailSection title="Entitlement Balance">
              <BnDetailRow label="Total Entitlement" value={row.total_entitlement != null ? formatCurrency(row.total_entitlement) : '—'} />
              <BnDetailRow label="Remaining" value={row.remaining_amount != null ? formatCurrency(row.remaining_amount) : '—'} />
            </BnDetailSection>

            {row.instruction_id && (
              <BnDetailSection title="Linked Instruction">
                <BnDetailRow label="Instruction ID" value={row.instruction_id} />
                <BnDetailRow label="Batch" value={row.batch_id || 'Not yet batched'} />
                <BnDetailRow label="Cheque No" value={row.cl_cheque_no || 'Not yet issued'} />
              </BnDetailSection>
            )}

            {row.status === 'SUSPENDED' && (
              <BnDetailSection title="Suspension">
                <BnDetailRow label="Reason" value={row.suspension_reason || '—'} />
                <BnDetailRow label="Suspended By" value={row.suspended_by || '—'} />
                <BnDetailRow label="Suspended At" value={row.suspended_at ? formatDateForDisplay(row.suspended_at) : '—'} />
              </BnDetailSection>
            )}

            {row.status === 'ARREARS' && (
              <BnDetailSection title="Arrears Details">
                <BnDetailRow label="Arrears From" value={row.arrears_from ? formatDateForDisplay(row.arrears_from) : '—'} />
                <BnDetailRow label="Arrears To" value={row.arrears_to ? formatDateForDisplay(row.arrears_to) : '—'} />
                <BnDetailRow label="Periods" value={row.arrears_periods ?? '—'} />
              </BnDetailSection>
            )}

            {row.adjusted_from_id && (
              <BnDetailSection title="Adjustment">
                <BnDetailRow label="Adjusted From" value={row.adjusted_from_id} />
                <BnDetailRow label="Reason" value={row.adjustment_reason || '—'} />
              </BnDetailSection>
            )}

            <Separator />

            {availableActions.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Row Actions</h4>
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
                        {actionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
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
            {rowId ? 'Schedule row not found.' : ''}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
