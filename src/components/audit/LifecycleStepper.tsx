import React from 'react';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const LIFECYCLE_STAGES = [
  'Planned',
  'Preparation',
  'Execution',
  'Issue Management',
  'Closure',
  'Completed',
] as const;

export type LifecycleStage = typeof LIFECYCLE_STAGES[number];

interface Props {
  currentStatus: string;
  onTransition?: (status: LifecycleStage) => void;
  isTransitioning?: boolean;
}

export function LifecycleStepper({ currentStatus, onTransition, isTransitioning }: Props) {
  const currentIndex = LIFECYCLE_STAGES.findIndex(
    (s) => s.toLowerCase() === (currentStatus || 'planned').toLowerCase()
  );

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {LIFECYCLE_STAGES.map((stage, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isFuture = idx > currentIndex;
        const isNext = idx === currentIndex + 1;

        return (
          <React.Fragment key={stage}>
            {idx > 0 && (
              <div className={cn(
                'h-0.5 w-8 shrink-0 transition-colors',
                isCompleted ? 'bg-primary' : 'bg-border'
              )} />
            )}
            <button
              disabled={!isNext || !onTransition || isTransitioning}
              onClick={() => isNext && onTransition?.(stage)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0',
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
              {stage}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export { LIFECYCLE_STAGES };
