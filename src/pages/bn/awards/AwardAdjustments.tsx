/**
 * Award Adjustments — rate history across all awards (bn_award_rate_history).
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBnAwardAdjustments } from '@/hooks/bn/useBnAwards';
import { formatDateForDisplay } from '@/lib/format-config';
import { BNDataGrid, type BNColumnDef } from '@/components/bn/grid';
import { Eye } from 'lucide-react';

export default function AwardAdjustments() {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useBnAwardAdjustments();

  const columns: BNColumnDef<any>[] = [
    { id: 'award_number', header: 'Award #', meta: { label: 'Award #', pinLeft: true, width: 140 },
      accessorFn: (r) => r.bn_award?.award_number ?? '—',
      cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '')}</span> },
    { id: 'ssn', header: 'SSN', meta: { label: 'SSN', width: 110 },
      accessorFn: (r) => r.bn_award?.ssn ?? '—',
      cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '')}</span> },
    { id: 'benefit', header: 'Benefit', meta: { label: 'Benefit', width: 140 },
      accessorFn: (r) => r.bn_award?.benefit_code ?? '—' },
    { accessorKey: 'effective_from', header: 'Effective From', meta: { label: 'Effective From', width: 130 },
      cell: ({ getValue }) => getValue() ? formatDateForDisplay(String(getValue())) : '—' },
    { accessorKey: 'effective_to', header: 'Effective To', meta: { label: 'Effective To', width: 130 },
      cell: ({ getValue }) => getValue() ? formatDateForDisplay(String(getValue())) : '—' },
    { accessorKey: 'rate_amount', header: 'Rate', meta: { label: 'Rate', width: 110, align: 'right' },
      cell: ({ getValue }) => <span className="text-right block">{Number(getValue() ?? 0).toFixed(2)}</span> },
    { accessorKey: 'change_reason', header: 'Reason', meta: { label: 'Reason', width: 200 } },
    { accessorKey: 'entered_by', header: 'Entered By', meta: { label: 'Entered By', width: 140 },
      cell: ({ getValue }) => <span className="text-xs">{String(getValue() ?? '—')}</span> },
  ];

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="t-page-title">Award Adjustments</h1>
        <p className="t-page-subtitle mt-1">Rate adjustments applied to long-term awards.</p>
      </div>
      <BNDataGrid
        id="bn.award-adjustments"
        data={data ?? []}
        isLoading={isLoading}
        columns={columns}
        onRefresh={() => refetch()}
        onRowClick={(r) => r.bn_award_id && navigate(`/bn/awards/${r.bn_award_id}`)}
        defaultSort={[{ id: 'effective_from', desc: true }]}
        exportFilename="bn_award_adjustments"
        searchPlaceholder="Search award, SSN, reason..."
        emptyMessage="No rate adjustments recorded."
        rowActions={[
          { key: 'view', label: 'Open Award', icon: <Eye className="h-3.5 w-3.5" />, onClick: (r) => r.bn_award_id && navigate(`/bn/awards/${r.bn_award_id}`) },
        ]}
      />
    </div>
  );
}
