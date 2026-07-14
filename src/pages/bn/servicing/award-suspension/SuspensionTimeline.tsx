import type { SuspensionTimelineItem } from '@/services/bn/awardSuspensionViewService';
import { formatDateTime } from './suspensionViewModels';
import { CircleDot, Check, X, Clock, FileText } from 'lucide-react';

const iconFor = (action: string) => {
  const a = action.toUpperCase();
  if (a.includes('APPROV')) return Check;
  if (a.includes('REJECT') || a.includes('WITHDRAW') || a.includes('CANCEL')) return X;
  if (a.includes('PROPOS')) return FileText;
  if (a.includes('PENDING') || a.includes('TASK')) return Clock;
  return CircleDot;
};

export function SuspensionTimeline({ items }: { items: SuspensionTimelineItem[] }) {
  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground italic">No timeline entries recorded yet.</p>
    );
  }
  return (
    <ol className="relative border-l border-border/60 space-y-4 pl-6">
      {items.map((item, idx) => {
        const Icon = iconFor(item.action);
        return (
          <li key={idx} className="relative">
            <span className="absolute -left-[13px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            </span>
            <p className="text-sm font-medium">{item.action}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(item.at)}
              {item.actor ? ` · ${item.actor}` : ''}
            </p>
            {(item.fromStatus || item.toStatus) && (
              <p className="text-xs text-muted-foreground">
                {item.fromStatus ?? '—'} → {item.toStatus ?? '—'}
              </p>
            )}
            {item.note && <p className="mt-1 text-xs">{item.note}</p>}
          </li>
        );
      })}
    </ol>
  );
}
