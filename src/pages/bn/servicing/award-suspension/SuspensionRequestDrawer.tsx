import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert } from 'lucide-react';
import {
  getSuspensionRequestDetails,
  type SuspensionRequestDetails,
} from '@/services/bn/awardSuspensionViewService';
import { SuspensionStatusBadge } from './SuspensionStatusBadge';
import { SuspensionTimeline } from './SuspensionTimeline';
import { ACTIONS_ENABLED, formatDate, formatMoney } from './suspensionViewModels';

interface Props {
  open: boolean;
  requestId: string | null;
  onOpenChange: (v: boolean) => void;
  canApprove: boolean;
  canAudit: boolean;
}

export function SuspensionRequestDrawer({
  open,
  requestId,
  onOpenChange,
  canApprove,
  canAudit,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SuspensionRequestDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !requestId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    getSuspensionRequestDetails(requestId)
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? 'Unable to load request');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, requestId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Suspension Request
            {data && <SuspensionStatusBadge status={data.request.status} />}
          </SheetTitle>
          <SheetDescription>
            Full request details, approval route and timeline.
          </SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="py-16 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin inline mr-2" aria-hidden />
            Loading request details…
          </div>
        )}

        {error && !loading && (
          <div className="my-6 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {data && !loading && (
          <div className="mt-4 space-y-6 pb-8">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Request summary
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Request ID</dt>
                <dd className="font-mono text-xs">{data.request.requestId}</dd>
                <dt className="text-muted-foreground">Proposed by</dt>
                <dd>{data.request.proposedBy ?? '—'}</dd>
                <dt className="text-muted-foreground">Proposed at</dt>
                <dd>{formatDate(data.request.proposedAt)}</dd>
                <dt className="text-muted-foreground">Effective date</dt>
                <dd>{formatDate(data.request.requestedEffectiveDate)}</dd>
                <dt className="text-muted-foreground">Reason</dt>
                <dd>{data.request.reasonCode ?? '—'}</dd>
                <dt className="text-muted-foreground">Correlation ID</dt>
                <dd className="font-mono text-xs">{data.request.correlationId ?? '—'}</dd>
              </dl>
              {data.request.narrative && (
                <p className="mt-2 rounded-md bg-muted/50 p-3 text-sm">
                  {data.request.narrative}
                </p>
              )}
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Award summary
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Award #</dt>
                <dd className="font-mono text-xs">
                  {data.award.awardNumber ?? data.award.awardId.slice(0, 8)}
                </dd>
                <dt className="text-muted-foreground">Claimant</dt>
                <dd>{data.award.claimantName}</dd>
                <dt className="text-muted-foreground">Benefit</dt>
                <dd>{data.award.benefitCode ?? '—'}</dd>
                <dt className="text-muted-foreground">Award type</dt>
                <dd>{data.award.awardType ?? '—'}</dd>
                <dt className="text-muted-foreground">Current status</dt>
                <dd>{data.award.awardStatus}</dd>
                <dt className="text-muted-foreground">Base amount</dt>
                <dd>{formatMoney(data.award.baseAmount, data.award.currency)}</dd>
                <dt className="text-muted-foreground">Frequency</dt>
                <dd>{data.award.frequency ?? '—'}</dd>
                <dt className="text-muted-foreground">Start</dt>
                <dd>{formatDate(data.award.startDate)}</dd>
              </dl>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Payment impact preview
              </h3>
              <div className="rounded-md border p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current periodic amount</span>
                  <span className="font-mono">
                    {formatMoney(data.award.baseAmount, data.award.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requested effective date</span>
                  <span>{formatDate(data.request.requestedEffectiveDate)}</span>
                </div>
                <p className="mt-2 text-xs italic text-muted-foreground">
                  Payment-hold application is not yet enabled by this workspace. Applied holds
                  will be issued by the sanctioned backend once activated.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Approval route
              </h3>
              {data.approvalRoute.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Approval-route metadata not yet published for this request.
                </p>
              ) : (
                <ol className="space-y-1 text-sm">
                  {data.approvalRoute.map((r) => (
                    <li key={r.level} className="flex justify-between border-b py-1">
                      <span>
                        L{r.level} · {r.role ?? '—'} · {r.workbasketCode ?? '—'}
                      </span>
                      <span className="text-muted-foreground">{r.outcome}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Timeline
              </h3>
              <SuspensionTimeline items={data.timeline} />
            </section>

            {canAudit && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Audit
                </h3>
                <p className="text-xs text-muted-foreground">
                  Full audit entries derived from{' '}
                  <code>core_workflow_action_log</code> and{' '}
                  <code>bn_award_suspension_event</code>. Correlation ID:{' '}
                  <span className="font-mono">{data.request.correlationId ?? '—'}</span>
                </p>
              </section>
            )}

            {canApprove && (
              <section className="rounded-md border p-3 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Approval decision
                </h3>
                {!ACTIONS_ENABLED && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" aria-hidden />
                    Approve and Reject are disabled while the feature is dark-launched.
                  </p>
                )}
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!ACTIONS_ENABLED}
                    aria-disabled={!ACTIONS_ENABLED}
                  >
                    Reject
                  </Button>
                  <Button size="sm" disabled={!ACTIONS_ENABLED} aria-disabled={!ACTIONS_ENABLED}>
                    Approve
                  </Button>
                </div>
              </section>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
