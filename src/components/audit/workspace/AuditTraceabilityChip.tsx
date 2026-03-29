import React from 'react';
import { Link2, FileText, AlertTriangle, MessageSquare, CheckSquare, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type TraceType = 'activity' | 'evidence' | 'finding' | 'response' | 'action' | 'workpaper';

const TRACE_CONFIG: Record<TraceType, { icon: any; color: string; label: string }> = {
  activity: { icon: FileText, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Activity' },
  evidence: { icon: Link2, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Evidence' },
  finding: { icon: AlertTriangle, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label: 'Finding' },
  response: { icon: MessageSquare, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', label: 'Response' },
  action: { icon: CheckSquare, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Action' },
  workpaper: { icon: FileText, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', label: 'Work Paper' },
};

interface TraceabilityChipProps {
  type: TraceType;
  id?: string;
  label?: string;
  onClick?: () => void;
  className?: string;
}

export function TraceabilityChip({ type, id, label, onClick, className }: TraceabilityChipProps) {
  const config = TRACE_CONFIG[type];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all',
              config.color,
              onClick && 'cursor-pointer hover:opacity-80',
              !onClick && 'cursor-default',
              className
            )}
          >
            <Icon className="h-3 w-3" />
            {label || config.label}
            {id && <span className="font-mono opacity-70">{id.slice(0, 6)}</span>}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{config.label}{id ? `: ${id.slice(0, 12)}` : ''}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Traceability chain visual
interface TraceChainProps {
  items: { type: TraceType; id?: string; label?: string; onClick?: () => void }[];
  className?: string;
}

export function TraceChain({ items, className }: TraceChainProps) {
  return (
    <div className={cn('flex items-center gap-1 flex-wrap', className)}>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
          <TraceabilityChip {...item} />
        </React.Fragment>
      ))}
    </div>
  );
}
