import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ShieldAlert, Plus, ShieldCheck } from 'lucide-react';
import { ACTIONS_ENABLED, formatDateTime } from './suspensionViewModels';
import type { AwardSuspensionRolloutState } from '@/services/bn/awardSuspensionViewService';

interface Props {
  lastRefreshed: string | null;
  onRefresh: () => void;
  canPropose: boolean;
  onPropose: () => void;
  loading?: boolean;
  rollout?: AwardSuspensionRolloutState | null;
}

export function AwardSuspensionHeader({
  lastRefreshed,
  onRefresh,
  canPropose,
  onPropose,
  loading,
  rollout,
}: Props) {
  // Effective dark-launch = UI constant AND live app_modules state.
  const effectiveActions = ACTIONS_ENABLED && (rollout?.effectiveActionsEnabled ?? false);

  return (
    <div className="flex flex-col gap-4 border-b border-border/60 pb-5 md:flex-row md:items-start md:justify-between">
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" aria-hidden />
            Award Suspension Management
          </h1>
          {!effectiveActions && (
            <Badge
              variant="outline"
              className="border-amber-400/60 bg-amber-500/10 text-amber-800 dark:text-amber-300"
            >
              <ShieldAlert className="h-3 w-3 mr-1" aria-hidden />
              Dark launch — read only
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Review active awards, propose temporary suspension, monitor approvals and view
          suspension history.
        </p>
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>
            Last refreshed:{' '}
            <span className="font-medium">{formatDateTime(lastRefreshed)}</span>
          </p>
          {rollout && (
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <span>
                Module enabled: <b>{String(rollout.moduleEnabled)}</b>
              </span>
              <span>
                Actions enabled: <b>{String(rollout.actionsEnabled)}</b>
              </span>
              <span>
                In menu: <b>{String(rollout.showInMenu)}</b>
              </span>
              <span>
                Env feature: <b>bn.servicing.awardSuspension</b>
              </span>
              {rollout.loadError && (
                <span className="text-destructive">Rollout load failed: {rollout.loadError}</span>
              )}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} aria-hidden />
          Refresh
        </Button>
        {canPropose && (
          <Button
            size="sm"
            onClick={onPropose}
            aria-label="New Suspension Request"
            title={
              effectiveActions
                ? 'Propose a new award suspension'
                : 'Form open for review; final submission is disabled during dark launch'
            }
          >
            <Plus className="h-4 w-4 mr-1" aria-hidden />
            New Suspension Request
          </Button>
        )}
      </div>
    </div>
  );
}
