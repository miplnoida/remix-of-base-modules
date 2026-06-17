/**
 * Entitlement List Table — migrated to BNDataGrid standard.
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';
import { BNDataGrid, type BNColumnDef } from '@/components/bn/grid';
import type { EntitlementWithContext } from '@/services/bn/entitlementService';
import { ENTITLEMENT_STATUS_LABELS } from '@/services/bn/entitlementService';

const statusColor: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  ACTIVE: 'bg-emerald-500/15 text-emerald-700',
  SUSPENDED: 'bg-amber-500/15 text-amber-700',
  EXHAUSTED: 'bg-muted text-muted-foreground',
  TERMINATED: 'bg-destructive/15 text-destructive',
  CANCELLED: 'bg-destructive/15 text-destructive',
  CLOSED: 'bg-muted text-muted-foreground',
  REOPENED: 'bg-blue-500/15 text-blue-700',
};

interface Props {
  items: EntitlementWithContext[];
  onViewDetail: (id: string) => void;
  isLoading?: boolean;
}

export const EntitlementListTable: React.FC<Props> = ({ items, onViewDetail, isLoading }) => {
  const columns: BNColumnDef<EntitlementWithContext>[] = [
    { accessorKey: 'ssn', header: 'SSN', meta: { label: 'SSN', pinLeft: true, width: 110 },
      cell: ({ getValue }) => <span className="font-mono text-sm">{String(getValue() ?? '')}</span> },
    { accessorKey: 'claim_number', header: 'Claim #', meta: { label: 'Claim #', width: 130 },
      cell: ({ getValue }) => <span className="font-mono text-sm font-medium">{String(getValue() ?? '—')}</span> },
    { accessorKey: 'benefit_name', header: 'Benefit', meta: { label: 'Benefit', width: 180 } },
    { accessorKey: 'entitlement_type', header: 'Type', meta: { label: 'Type', width: 120 } },
    { accessorKey: 'weekly_rate', header: 'Weekly Rate', meta: { label: 'Weekly Rate', width: 120, align: 'right' },
      cell: ({ getValue }) => <span className="font-mono text-sm">${Number(getValue() ?? 0).toFixed(2)}</span> },
    { accessorKey: 'total_entitlement', header: 'Total', meta: { label: 'Total', width: 120, align: 'right' },
      cell: ({ getValue }) => <span className="font-mono text-sm">${Number(getValue() ?? 0).toFixed(2)}</span> },
    { accessorKey: 'remaining_amount', header: 'Remaining', meta: { label: 'Remaining', width: 120, align: 'right' },
      cell: ({ getValue }) => {
        const v = Number(getValue() ?? 0);
        return <span className={`font-mono text-sm ${v <= 0 ? 'text-muted-foreground' : ''}`}>${v.toFixed(2)}</span>;
      } },
    { accessorKey: 'effective_from', header: 'Effective From', meta: { label: 'Effective From', width: 130 },
      cell: ({ getValue }) => formatDateForDisplay(String(getValue() ?? '')) },
    { accessorKey: 'payment_frequency', header: 'Frequency', meta: { label: 'Frequency', width: 120 } },
    { accessorKey: 'status', header: 'Status', meta: { label: 'Status', width: 130 },
      cell: ({ getValue }) => {
        const s = String(getValue() ?? '');
        return <Badge variant="outline" className={`text-xs ${statusColor[s] || ''}`}>{ENTITLEMENT_STATUS_LABELS[s as keyof typeof ENTITLEMENT_STATUS_LABELS] || s}</Badge>;
      } },
    { accessorKey: 'active_instructions', header: 'Payables', meta: { label: 'Payables', width: 100 },
      cell: ({ getValue }) => {
        const n = Number(getValue() ?? 0);
        return n > 0 ? <Badge variant="secondary" className="text-xs">{n}</Badge> : <span className="text-xs text-muted-foreground">0</span>;
      } },
  ];

  return (
    <BNDataGrid
      id="bn.entitlements"
      data={items}
      isLoading={isLoading}
      columns={columns}
      onRowClick={(e) => onViewDetail(e.id)}
      defaultSort={[{ id: 'effective_from', desc: true }]}
      exportFilename="bn_entitlements"
      searchPlaceholder="Search SSN, claim, benefit..."
      emptyMessage="No entitlements found"
      rowActions={[
        { key: 'view', label: 'View', icon: <Eye className="h-3.5 w-3.5" />, onClick: (e) => onViewDetail(e.id) },
      ]}
    />
  );
};
