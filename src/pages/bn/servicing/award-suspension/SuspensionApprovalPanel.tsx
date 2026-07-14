/**
 * Compact approval-review panel intended for embedding in the drawer or a
 * dedicated review workspace. Approve/Reject remain disabled while
 * ACTIONS_ENABLED=false. This component is UI-only and never mutates data.
 */
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import type { SuspensionRequestDetails } from '@/services/bn/awardSuspensionViewService';
import { ACTIONS_ENABLED, formatDate, formatMoney } from './suspensionViewModels';

export function SuspensionApprovalPanel({
  details,
  canApprove,
}: {
  details: SuspensionRequestDetails;
  canApprove: boolean;
}) {
  if (!canApprove) return null;
  return (
    <div className="space-y-3 rounded-md border p-4">
      <h3 className="text-sm font-semibold">Approval review</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Award</dt>
        <dd>{details.award.awardNumber ?? details.award.awardId.slice(0, 8)}</dd>
        <dt className="text-muted-foreground">Claimant</dt>
        <dd>{details.award.claimantName}</dd>
        <dt className="text-muted-foreground">Effective</dt>
        <dd>{formatDate(details.request.requestedEffectiveDate)}</dd>
        <dt className="text-muted-foreground">Base amount</dt>
        <dd>{formatMoney(details.award.baseAmount, details.award.currency)}</dd>
      </dl>
      <p className="text-xs text-muted-foreground italic">
        Maker-checker enforced: administrators cannot bypass the assigned approval level.
      </p>
      {!ACTIONS_ENABLED && (
        <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
          <ShieldAlert className="h-3 w-3" aria-hidden />
          Approve/Reject disabled while dark-launched.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" disabled={!ACTIONS_ENABLED}>
          Reject
        </Button>
        <Button size="sm" disabled={!ACTIONS_ENABLED}>
          Approve
        </Button>
      </div>
    </div>
  );
}
