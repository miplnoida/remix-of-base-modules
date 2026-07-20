/**
 * BN Mortality — Actions Panel (server-driven).
 *
 * BN-MORT-UI-1C: This component no longer computes availability in the
 * browser. It calls the secure `BN_MORTALITY_GET_ACTION_AVAILABILITY`
 * query and renders the server's decision verbatim, including the exact
 * reasons for each disabled row.
 *
 * The server evaluates: rollout (`actions_enabled`), implementation
 * flag, capability grants (fail-closed), lifecycle from-status,
 * maker-checker separation (derived from immutable event history), and
 * data-readiness predicates. The UI never fabricates an "enabled" state
 * — mutations are enforced server-side regardless.
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
import { AlertCircle, Lock, ShieldAlert, ShieldX } from 'lucide-react';

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
    const denied = qe?.status === 'DENIED';
    return (
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Available actions</CardTitle></CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <ShieldX className="h-4 w-4" />
            <AlertTitle>{denied ? 'Access denied' : 'Unable to load action availability'}</AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="text-sm">
                {qe?.errors?.[0]?.message ?? (error instanceof Error ? error.message : 'Unknown error.')}
              </p>
              <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const payload = data?.data ?? null;
  const rows: readonly MortalityActionAvailabilityDto[] = payload?.rows ?? [];
  const actionsEnabled = payload?.actionsEnabled ?? false;


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
