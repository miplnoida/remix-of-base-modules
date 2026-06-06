import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useClaimAmendmentLog, useClaimCorrectionRequests } from '@/hooks/bn/useClaimEditability';
import { formatDateForDisplay } from '@/lib/format-config';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claimId: string;
}

export function AmendmentHistoryDrawer({ open, onOpenChange, claimId }: Props) {
  const { data: log = [], isLoading } = useClaimAmendmentLog(open ? claimId : null);
  const { data: corrections = [] } = useClaimCorrectionRequests(open ? claimId : null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Amendment & Correction History</SheetTitle>
        </SheetHeader>

        <section className="mt-4 space-y-3">
          <h3 className="text-sm font-semibold">Field Amendments</h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : log.length === 0 ? (
            <p className="text-sm text-muted-foreground">No amendments recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {log.map((row) => (
                <li key={row.id} className="rounded border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{row.field_key}</span>
                    <Badge variant="outline">{row.field_area ?? '—'}</Badge>
                    <Badge variant="secondary">{row.source_channel}</Badge>
                    <Badge>{row.approval_status}</Badge>
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                    <span className="text-muted-foreground">Before: <code>{JSON.stringify(row.before_value)}</code></span>
                    <span className="text-muted-foreground">After: <code>{JSON.stringify(row.after_value)}</code></span>
                  </div>
                  {row.reason && <p className="mt-1 text-xs italic">Reason: {row.reason}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    by {row.amended_by} on {formatDateForDisplay(row.amended_at)} (status: {row.claim_status_at_change ?? '—'})
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold">Correction Requests</h3>
          {corrections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No correction requests.</p>
          ) : (
            <ul className="space-y-2">
              {corrections.map((c) => (
                <li key={c.id} className="rounded border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge>{c.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      by {c.requested_by} on {formatDateForDisplay(c.requested_at)}
                    </span>
                  </div>
                  <p className="mt-1">{c.message}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </SheetContent>
    </Sheet>
  );
}
