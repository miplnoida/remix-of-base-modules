/**
 * BN Mortality — Actions Panel (fully server-driven).
 *
 * BN-MORT-UI-1D §F: this component renders the server's action-availability
 * decision verbatim, including per-command reasons, integration/data
 * readiness, and maker details. All error envelopes (DENIED, INVALID,
 * FAILED, NOT_FOUND) are surfaced with distinct visuals — DENIED offers
 * no retry, transient FAILED offers retry, INVALID lists the offending
 * field, and NOT_FOUND explains the event no longer exists.
 *
 * The panel also runs a client-side invariant: the server must return
 * exactly 26 canonical rows. A mismatch is treated as a schema-drift
 * incident and surfaces `MALFORMED_ACTION_AVAILABILITY`.
 */
import React from 'react';
import type { BnModuleAccessContext } from '@/components/bn/access/BnModuleRouteGate';
import { useMortalityActionAvailability } from '@/hooks/bn/mortality/useMortalityQueries';
import type { MortalityActionAvailabilityDto } from '@/types/bn/mortality/mortalityActionAvailability';
import { BenefitsQueryExecutionError } from '@/services/bn/queries/benefitsQueryExecutionError';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, FileQuestion, Lock, ShieldAlert, ShieldX, XCircle } from 'lucide-react';

/** Server invariant: the canonical Mortality command set has exactly 26 rows. */
const EXPECTED_COMMAND_COUNT = 26;

function humanCommand(name: string): string {
  return name
    .replace(/^BN_MORTALITY_/, '')
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

interface Props {
  ctx: BnModuleAccessContext;
  eventId: string | null;
}

export const BnMortalityActionsPanel: React.FC<Props> = ({ ctx, eventId }) => {
  const { data, isLoading, error, refetch, isFetching } = useMortalityActionAvailability(eventId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Available actions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    const qe = error instanceof BenefitsQueryExecutionError ? error : null;
    const status = qe?.status ?? 'FAILED';
    const first = qe?.errors?.[0];
    const correlationId = qe?.correlationId ?? null;

    let title = 'Unable to load action availability';
    let icon: React.ReactNode = <ShieldX className="h-4 w-4" />;
    let canRetry = true;

    switch (status) {
      case 'DENIED':
        title = 'Access denied';
        icon = <Lock className="h-4 w-4" />;
        canRetry = false;
        break;
      case 'INVALID':
        title = 'Invalid request';
        icon = <XCircle className="h-4 w-4" />;
        canRetry = false;
        break;
      case 'NOT_FOUND':
        title = 'Event not found';
        icon = <FileQuestion className="h-4 w-4" />;
        canRetry = false;
        break;
      case 'FAILED':
      default:
        title = 'Server error loading actions';
        icon = <AlertCircle className="h-4 w-4" />;
        canRetry = true;
        break;
    }

    return (
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Available actions</CardTitle></CardHeader>
        <CardContent>
          <Alert variant={status === 'DENIED' || status === 'FAILED' ? 'destructive' : 'default'}>
            {icon}
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="text-sm">
                {first?.message ?? (error instanceof Error ? error.message : 'Unknown error.')}
              </p>
              {first?.code && (
                <p className="text-xs font-mono opacity-70">Code: {first.code}{first.field ? ` (${first.field})` : ''}</p>
              )}
              {correlationId && (
                <p className="text-xs font-mono opacity-70">Correlation: {correlationId}</p>
              )}
              {canRetry && (
                <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
                  {isFetching ? 'Retrying…' : 'Retry'}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const payload = data?.data ?? null;
  const rows: readonly MortalityActionAvailabilityDto[] = payload?.rows ?? [];
  const actionsEnabled = payload?.actionsEnabled ?? false;

  // Client-side invariant: the server MUST return the full canonical matrix.
  if (payload && rows.length !== EXPECTED_COMMAND_COUNT) {
    return (
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Available actions</CardTitle></CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Malformed action matrix</AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="text-sm">
                Expected {EXPECTED_COMMAND_COUNT} canonical commands, received {rows.length}.
                This indicates command-catalogue drift between the browser and edge function.
              </p>
              <p className="text-xs font-mono opacity-70">Code: MALFORMED_ACTION_AVAILABILITY</p>
              <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>Reload</Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Available actions</CardTitle>
          {!actionsEnabled && (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" /> Read-only pilot
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Every command is shown so the business team can see the planned workflow. Availability is computed server-side against the live event snapshot; the UI never fabricates a success response.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.command}
            className="flex items-start justify-between gap-3 rounded-md border bg-card p-3"
            data-testid={`mortality-action-row-${row.command}`}
            data-available={row.available ? 'true' : 'false'}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-sm">{row.displayName || humanCommand(row.command)}</span>
                <Badge variant="outline" className="text-[10px]">{row.requiredCapability}</Badge>
                {row.requiresMakerChecker && (
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <ShieldAlert className="h-3 w-3" /> Maker-checker
                  </Badge>
                )}
                {!row.implemented && (
                  <Badge variant="destructive" className="text-[10px]">Not certified</Badge>
                )}
                {!row.integrationReady && row.implemented && (
                  <Badge variant="secondary" className="text-[10px]">Integration pending</Badge>
                )}
              </div>
              {row.requiresMakerChecker && row.makerUserId && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Maker: <span className="font-mono">{row.makerUserId.slice(0, 8)}…</span>
                  {row.makerStep && <> · step <span className="font-mono">{row.makerStep}</span></>}
                  {row.makerOccurredAt && <> · {new Date(row.makerOccurredAt).toLocaleString()}</>}
                </p>
              )}
              {row.reasons.length > 0 && (
                <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                  {row.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              )}
              {row.reasons.length === 0 && row.available && (
                <p className="mt-1 text-xs text-emerald-600">Ready to execute.</p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={!row.available || !ctx.actionsEnabled}
              className="shrink-0"
            >
              Execute
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default BnMortalityActionsPanel;
