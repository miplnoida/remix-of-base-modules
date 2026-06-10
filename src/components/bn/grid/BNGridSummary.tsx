import React from 'react';
import { cn } from '@/lib/utils';
import type { BNSummaryChip } from './types';

const toneClass: Record<NonNullable<BNSummaryChip['tone']>, string> = {
  default: 'bg-muted text-foreground',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  muted: 'bg-muted text-muted-foreground',
};

export const BNGridSummary: React.FC<{ chips: BNSummaryChip[] }> = ({ chips }) => {
  if (!chips?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {chips.map((c, i) => (
        <div
          key={`${c.label}-${i}`}
          className={cn(
            'inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium',
            toneClass[c.tone ?? 'default'],
          )}
        >
          <span className="opacity-80">{c.label}</span>
          <span className="font-semibold tabular-nums">{c.value}</span>
        </div>
      ))}
    </div>
  );
};
