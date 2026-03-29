import React from 'react';
import { CheckCircle, Circle, Loader2, Ban, PauseCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EXECUTION_STATUSES, type ExecutionStatus } from '@/hooks/useEngagementExecution';

const MAIN_FLOW: ExecutionStatus[] = [
  'Planned',
  'Ready for Launch',
  'Notification Sent',
  'Opening Meeting Scheduled',
  'Fieldwork In Progress',
  'Findings Drafting',
  'Management Response Pending',
  'Final Report Issued',
  'Follow-up Monitoring',
  'Closed',
];

const SHORT_LABELS: Record<string, string> = {
  'Planned': 'Planned',
  'Ready for Launch': 'Ready',
  'Notification Sent': 'Notified',
  'Opening Meeting Scheduled': 'Opening',
  'Fieldwork In Progress': 'Fieldwork',
  'Findings Drafting': 'Findings',
  'Management Response Pending': 'Mgmt Response',
  'Final Report Issued': 'Report',
  'Follow-up Monitoring': 'Follow-up',
  'Closed': 'Closed',
  'Deferred': 'Deferred',
  'Cancelled': 'Cancelled',
};

interface Props {
  currentStatus: string;
  onTransition?: (status: ExecutionStatus) => void;
  isTransitioning?: boolean;
}

export function ExecutionLifecycleStepper({ currentStatus, onTransition, isTransitioning }: Props) {
  const normalized = currentStatus || 'Planned';

  // Handle special statuses
  if (normalized === 'Deferred' || normalized === 'Cancelled') {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className={cn(
          'flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold',
          normalized === 'Cancelled' ? 'bg-destructive/10 text-destructive' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        )}>
          {normalized === 'Cancelled' ? <Ban className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
          {normalized}
        </div>
      </div>
    );
  }

  const currentIndex = MAIN_FLOW.findIndex(
    (s) => s.toLowerCase() === normalized.toLowerCase()
  );

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto py-2">
      {MAIN_FLOW.map((stage, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isFuture = idx > currentIndex;
        const isNext = idx === currentIndex + 1;

        return (
          <React.Fragment key={stage}>
            {idx > 0 && (
              <div className={cn(
                'h-0.5 w-4 sm:w-6 shrink-0 transition-colors',
                isCompleted ? 'bg-primary' : 'bg-border'
              )} />
            )}
            <button
              disabled={!isNext || !onTransition || isTransitioning}
              onClick={() => isNext && onTransition?.(stage)}
              title={stage}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all shrink-0',
                isCompleted && 'bg-primary/10 text-primary',
                isCurrent && 'bg-primary text-primary-foreground shadow-sm',
                isFuture && 'bg-muted text-muted-foreground',
                isNext && onTransition && 'hover:bg-primary/20 hover:text-primary cursor-pointer border border-dashed border-primary/40',
              )}
            >
              {isTransitioning && isCurrent ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isCompleted ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              {SHORT_LABELS[stage] || stage}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
