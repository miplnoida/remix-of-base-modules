/**
 * Schedule Grid — Timeline-aware table for schedule rows
 */
import React from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { BnStatusBadge, BnEmptyState } from '@/components/bn/shared';
import { Eye } from 'lucide-react';
import type { ScheduleWithContext } from '@/services/bn/scheduleService';
import { formatDateForDisplay } from '@/lib/format-config';
import { cn } from '@/lib/utils';
import { isBefore, startOfDay } from 'date-fns';

interface Props {
  items: ScheduleWithContext[];
  onViewDetail: (id: string) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

const formatCurrency = (amount: number | null) => {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD' }).format(amount);
};

const FREQ_LABELS: Record<string, string> = {
  WEEKLY: 'Weekly',
  FORTNIGHTLY: 'Fortnightly',
  MONTHLY: 'Monthly',
  ONE_TIME: 'One-Time',
};

export const ScheduleGrid: React.FC<Props> = ({ items, onViewDetail, selectedIds, onSelectionChange }) => {
  if (items.length === 0) {
    return <BnEmptyState type="no-results" description="No schedule rows match your criteria." />;
  }

  const today = startOfDay(new Date());
  const selectableStatuses = ['PROJECTED', 'DUE', 'SUSPENDED', 'ARREARS'];
  const selectableItems = items.filter(i => selectableStatuses.includes(i.status));
  const allSelected = selectableItems.length > 0 && selectableItems.every(i => selectedIds.includes(i.id));

  const toggleAll = () => {
    onSelectionChange(allSelected ? [] : selectableItems.map(i => i.id));
  };

  const toggleOne = (id: string) => {
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]
    );
  };

  return (
    <div className="rounded-lg border bg-card overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            </TableHead>
            <TableHead className="text-xs w-14">#</TableHead>
            <TableHead className="text-xs">SSN</TableHead>
            <TableHead className="text-xs">Claim #</TableHead>
            <TableHead className="text-xs">Frequency</TableHead>
            <TableHead className="text-xs">Period</TableHead>
            <TableHead className="text-xs">Due Date</TableHead>
            <TableHead className="text-xs text-right">Amount</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Mode</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((r) => {
            const isPast = isBefore(new Date(r.due_date), today) && r.status === 'PROJECTED';
            const isSelectable = selectableStatuses.includes(r.status);

            return (
              <TableRow
                key={r.id}
                className={cn(
                  'cursor-pointer hover:bg-muted/40 transition-colors',
                  selectedIds.includes(r.id) && 'bg-primary/5',
                  isPast && 'bg-amber-50/50 dark:bg-amber-950/10',
                  r.status === 'ARREARS' && 'bg-violet-50/50 dark:bg-violet-950/10',
                )}
                onClick={() => onViewDetail(r.id)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {isSelectable ? (
                    <Checkbox
                      checked={selectedIds.includes(r.id)}
                      onCheckedChange={() => toggleOne(r.id)}
                    />
                  ) : (
                    <span className="block h-4 w-4" />
                  )}
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{r.sequence_number}</TableCell>
                <TableCell className="text-xs font-mono">{r.ssn}</TableCell>
                <TableCell className="text-xs font-mono">{r.claim_number || '—'}</TableCell>
                <TableCell>
                  <span className="text-xs rounded bg-muted px-1.5 py-0.5">
                    {FREQ_LABELS[r.frequency] || r.frequency}
                  </span>
                </TableCell>
                <TableCell className="text-xs">
                  {formatDateForDisplay(r.period_start)} — {formatDateForDisplay(r.period_end)}
                </TableCell>
                <TableCell className={cn(
                  'text-xs',
                  isPast && 'font-medium text-amber-600',
                )}>
                  {formatDateForDisplay(r.due_date)}
                </TableCell>
                <TableCell className="text-xs text-right font-mono">{formatCurrency(r.amount)}</TableCell>
                <TableCell>
                  <BnStatusBadge status={r.status} size="sm" dot />
                </TableCell>
                <TableCell>
                  <span className="text-[10px] text-muted-foreground uppercase">{r.generation_mode}</span>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
