/**
 * StatusActionBar
 *
 * Renders the workflow-driven status action buttons for a Compliance entity.
 * Driven by the `ce_allowed_status_transitions` view (which mirrors the
 * baseline workflow's workflow_steps + workflow_step_actions). Configuring
 * which actions appear is done from Admin → Workflows (no per-page code edits).
 */
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useCeStatusActions, type UseCeStatusActionsOptions } from '@/hooks/compliance/useCeStatusActions';

interface StatusActionBarProps extends UseCeStatusActionsOptions {
  /** Optional: override how a specific action button renders (icon, variant). */
  renderActionExtras?: (actionCode: string) => { icon?: React.ReactNode; variant?: 'default' | 'destructive' | 'outline' | 'secondary' } | undefined;
  /** Optional: capture the click instead of immediately firing the transition (e.g. to open a confirm dialog first). */
  onActionClick?: (action: { actionCode: string; actionLabel: string; toStatus: string }) => void;
  className?: string;
}

export function StatusActionBar({
  renderActionExtras,
  onActionClick,
  className,
  ...hookOpts
}: StatusActionBarProps) {
  const { availableActions, isLoadingActions, transition, isPending } = useCeStatusActions(hookOpts);

  if (isLoadingActions) {
    return (
      <div className={className}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (availableActions.length === 0) return null;

  return (
    <div className={className ?? 'flex items-center gap-2 flex-wrap'}>
      {availableActions.map((a) => {
        const extras = renderActionExtras?.(a.actionCode) ?? {};
        return (
          <Button
            key={a.actionCode}
            variant={extras.variant ?? 'outline'}
            size="sm"
            disabled={isPending}
            onClick={() => {
              if (onActionClick) {
                onActionClick({ actionCode: a.actionCode, actionLabel: a.actionLabel, toStatus: a.toStatus });
              } else {
                void transition({ actionCode: a.actionCode });
              }
            }}
          >
            {extras.icon}
            <span className={extras.icon ? 'ml-1' : ''}>{a.actionLabel}</span>
          </Button>
        );
      })}
    </div>
  );
}
