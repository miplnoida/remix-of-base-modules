/**
 * Payables Queue Table — Work queue with selection, readiness indicators, and age tracking
 */
import React from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { BnStatusBadge, BnEmptyState } from '@/components/bn/shared';
import { Eye, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import type { PayableWithContext } from '@/services/bn/payablesQueueService';
import { formatDateForDisplay } from '@/lib/format-config';
import { cn } from '@/lib/utils';

interface Props {
  items: PayableWithContext[];
  onViewDetail: (id: string) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  isLoading: boolean;
}

const ReadinessIcon: React.FC<{ score: number }> = ({ score }) => {
  if (score >= 100) return <ShieldCheck className="h-4 w-4 text-emerald-600" />;
  if (score >= 60) return <ShieldAlert className="h-4 w-4 text-amber-500" />;
  return <ShieldX className="h-4 w-4 text-destructive" />;
};

const formatCurrency = (amount: number | null) => {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD' }).format(amount);
};

export const PayablesQueueTable: React.FC<Props> = ({
  items, onViewDetail, selectedIds, onSelectionChange, isLoading,
}) => {
  if (!isLoading && items.length === 0) {
    return <BnEmptyState type="no-results" description="No payable instructions match your criteria." />;
  }

  const allSelected = items.length > 0 && selectedIds.length === items.length;

  const toggleAll = () => {
    onSelectionChange(allSelected ? [] : items.map(i => i.id));
  };

  const toggleOne = (id: string) => {
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter(x => x !== id)
        : [...selectedIds, id]
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
            <TableHead className="text-xs">SSN</TableHead>
            <TableHead className="text-xs">Claim #</TableHead>
            <TableHead className="text-xs">Benefit</TableHead>
            <TableHead className="text-xs">Type</TableHead>
            <TableHead className="text-xs text-right">Amount</TableHead>
            <TableHead className="text-xs">Due Date</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs text-center">Readiness</TableHead>
            <TableHead className="text-xs text-center">Age (d)</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((p) => (
            <TableRow
              key={p.id}
              className={cn(
                'cursor-pointer hover:bg-muted/40 transition-colors',
                selectedIds.includes(p.id) && 'bg-primary/5',
                p.is_duplicate && 'bg-destructive/5',
              )}
              onClick={() => onViewDetail(p.id)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.includes(p.id)}
                  onCheckedChange={() => toggleOne(p.id)}
                />
              </TableCell>
              <TableCell className="text-xs font-mono">{p.ssn}</TableCell>
              <TableCell className="text-xs font-mono">{p.claim_number || '—'}</TableCell>
              <TableCell className="text-xs">{p.benefit_name || '—'}</TableCell>
              <TableCell>
                <span className="text-xs rounded bg-muted px-1.5 py-0.5">{p.instruction_type}</span>
              </TableCell>
              <TableCell className="text-xs text-right font-mono">{formatCurrency(p.amount)}</TableCell>
              <TableCell className="text-xs">
                {p.due_date ? formatDateForDisplay(p.due_date) : p.scheduled_date ? formatDateForDisplay(p.scheduled_date) : '—'}
              </TableCell>
              <TableCell>
                <BnStatusBadge status={p.status} size="sm" dot />
              </TableCell>
              <TableCell className="text-center">
                <ReadinessIcon score={p.readiness_score ?? 0} />
              </TableCell>
              <TableCell className={cn(
                'text-center text-xs font-medium',
                p.age_days > 14 ? 'text-destructive' : p.age_days > 7 ? 'text-amber-600' : 'text-muted-foreground'
              )}>
                {p.age_days}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
