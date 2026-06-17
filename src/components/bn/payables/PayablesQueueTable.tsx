/**
 * Payables Queue Table — migrated to BNDataGrid standard.
 * Preserves multi-select for bulk batch assignment.
 */
import React from 'react';
import { Eye, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { BnStatusBadge } from '@/components/bn/shared';
import { formatDateForDisplay } from '@/lib/format-config';
import { BNDataGrid, type BNColumnDef, type BNBulkAction } from '@/components/bn/grid';
import type { PayableWithContext } from '@/services/bn/payablesQueueService';
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
  // Bridge bulk selection — BNDataGrid manages its own selection internally, so we
  // expose a "Mark selected" bulk action that pushes ids upward.
  const bulkActions: BNBulkAction<PayableWithContext>[] = [
    {
      key: 'mark',
      label: 'Use selection for batch',
      onClick: (rows) => onSelectionChange(rows.map(r => r.id)),
    },
    ...(selectedIds.length > 0 ? [{
      key: 'clear',
      label: 'Clear staged selection',
      variant: 'destructive' as const,
      onClick: () => onSelectionChange([]),
    }] : []),
  ];

  const columns: BNColumnDef<PayableWithContext>[] = [
    { accessorKey: 'ssn', header: 'SSN', meta: { label: 'SSN', pinLeft: true, width: 110 },
      cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '')}</span> },
    { accessorKey: 'claim_number', header: 'Claim #', meta: { label: 'Claim #', width: 130 },
      cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '—')}</span> },
    { accessorKey: 'benefit_name', header: 'Benefit', meta: { label: 'Benefit', width: 160 },
      cell: ({ getValue }) => <span className="text-xs">{String(getValue() ?? '—')}</span> },
    { accessorKey: 'instruction_type', header: 'Type', meta: { label: 'Type', width: 120 },
      cell: ({ getValue }) => <span className="text-xs rounded bg-muted px-1.5 py-0.5">{String(getValue() ?? '')}</span> },
    { accessorKey: 'amount', header: 'Amount', meta: { label: 'Amount', width: 130, align: 'right' },
      cell: ({ getValue }) => <span className="text-xs font-mono">{formatCurrency(getValue() as number | null)}</span> },
    { id: 'due_date', header: 'Due Date', meta: { label: 'Due Date', width: 120 },
      accessorFn: (p) => p.due_date ?? p.scheduled_date ?? null,
      cell: ({ getValue }) => <span className="text-xs">{getValue() ? formatDateForDisplay(String(getValue())) : '—'}</span> },
    { accessorKey: 'status', header: 'Status', meta: { label: 'Status', width: 130 },
      cell: ({ getValue }) => <BnStatusBadge status={String(getValue() ?? '')} size="sm" dot /> },
    { accessorKey: 'readiness_score', header: 'Readiness', meta: { label: 'Readiness', width: 110, align: 'center' },
      cell: ({ getValue }) => <div className="flex justify-center"><ReadinessIcon score={Number(getValue() ?? 0)} /></div> },
    { accessorKey: 'age_days', header: 'Age (d)', meta: { label: 'Age (d)', width: 90, align: 'center' },
      cell: ({ getValue }) => {
        const d = Number(getValue() ?? 0);
        return (
          <span className={cn('text-center text-xs font-medium block',
            d > 14 ? 'text-destructive' : d > 7 ? 'text-amber-600' : 'text-muted-foreground')}>
            {d}
          </span>
        );
      } },
  ];

  return (
    <BNDataGrid
      id="bn.payables-queue"
      data={items}
      isLoading={isLoading}
      columns={columns}
      onRowClick={(p) => onViewDetail(p.id)}
      defaultSort={[{ id: 'age_days', desc: true }]}
      exportFilename="bn_payables_queue"
      searchPlaceholder="Search SSN, claim, benefit..."
      emptyMessage="No payable instructions match your criteria."
      rowActions={[
        { key: 'view', label: 'View', icon: <Eye className="h-3.5 w-3.5" />, onClick: (p) => onViewDetail(p.id) },
      ]}
      bulkActions={bulkActions}
    />
  );
};
