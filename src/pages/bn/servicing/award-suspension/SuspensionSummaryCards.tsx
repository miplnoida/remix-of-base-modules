import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { SuspensionSummaryCounts } from '@/services/bn/awardSuspensionViewService';
import {
  Activity,
  ClipboardList,
  Inbox,
  CheckCheck,
  PauseCircle,
  Ban,
  type LucideIcon,
} from 'lucide-react';

type CardKey =
  | 'active'
  | 'openRequests'
  | 'myApprovals'
  | 'approvedPending'
  | 'suspended'
  | 'rejected';

const items: {
  key: CardKey;
  label: string;
  tooltip: string;
  icon: LucideIcon;
  accent: string;
}[] = [
  {
    key: 'active',
    label: 'Active Awards',
    tooltip: 'Awards currently in ACTIVE status and eligible for suspension proposals.',
    icon: Activity,
    accent: 'text-emerald-600',
  },
  {
    key: 'openRequests',
    label: 'Open Suspension Requests',
    tooltip: 'Suspension proposals that are still working through the approval workflow.',
    icon: ClipboardList,
    accent: 'text-sky-600',
  },
  {
    key: 'myApprovals',
    label: 'Pending My Approval',
    tooltip: 'Approval tasks currently assigned to you.',
    icon: Inbox,
    accent: 'text-amber-600',
  },
  {
    key: 'approvedPending',
    label: 'Approved – Not Yet Applied',
    tooltip: 'Requests approved by all levels, awaiting the applied payment hold.',
    icon: CheckCheck,
    accent: 'text-emerald-700',
  },
  {
    key: 'suspended',
    label: 'Currently Suspended',
    tooltip: 'Awards whose live status is SUSPENDED after an applied request.',
    icon: PauseCircle,
    accent: 'text-amber-700',
  },
  {
    key: 'rejected',
    label: 'Rejected or Withdrawn',
    tooltip: 'Requests that were rejected, withdrawn or cancelled without effect.',
    icon: Ban,
    accent: 'text-destructive',
  },
];

interface Props {
  counts: SuspensionSummaryCounts;
  onSelect: (key: CardKey) => void;
  activeKey?: CardKey | null;
  loading?: boolean;
}

export function SuspensionSummaryCards({ counts, onSelect, activeKey, loading }: Props) {
  const values: Record<CardKey, number> = {
    active: counts.activeAwards,
    openRequests: counts.openRequests,
    myApprovals: counts.pendingMyApproval,
    approvedPending: counts.approvedNotYetApplied,
    suspended: counts.currentlySuspended,
    rejected: counts.rejectedOrWithdrawn,
  };

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeKey === item.key;
        return (
          <Card
            key={item.key}
            role="button"
            tabIndex={0}
            aria-pressed={active}
            title={item.tooltip}
            onClick={() => onSelect(item.key)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(item.key);
              }
            }}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50',
              active && 'ring-2 ring-primary/70 shadow-md'
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground truncate">
                    {item.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold tabular-nums">
                    {loading ? '—' : values[item.key]}
                  </p>
                </div>
                <Icon className={cn('h-5 w-5 shrink-0', item.accent)} aria-hidden />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export type { CardKey as SummaryCardKey };
