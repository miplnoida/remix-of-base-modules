/**
 * Survivor Awards — filtered view of bn_award where benefit is survivors.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useBnAwards } from '@/hooks/bn/useBnAwards';
import { formatDateForDisplay } from '@/lib/format-config';
import { BNDataGrid, type BNColumnDef } from '@/components/bn/grid';
import { Eye } from 'lucide-react';

export default function SurvivorAwards() {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useBnAwards({ survivorsOnly: true });

  const columns: BNColumnDef<any>[] = [
    { accessorKey: 'award_number', header: 'Award #', meta: { label: 'Award #', pinLeft: true, width: 140 },
      cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '—')}</span> },
    { accessorKey: 'ssn', header: 'Deceased SSN', meta: { label: 'Deceased SSN', width: 130 },
      cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '—')}</span> },
    { accessorKey: 'status', header: 'Status', meta: { label: 'Status', width: 120 },
      cell: ({ getValue }) => <Badge variant={getValue() === 'ACTIVE' ? 'default' : 'secondary'}>{String(getValue() ?? '')}</Badge> },
    { accessorKey: 'start_date', header: 'Start', meta: { label: 'Start', width: 120 },
      cell: ({ getValue }) => getValue() ? formatDateForDisplay(String(getValue())) : '—' },
    { accessorKey: 'base_amount', header: 'Base Amt', meta: { label: 'Base Amt', width: 120, align: 'right' },
      cell: ({ getValue }) => <span className="text-right block">{Number(getValue() ?? 0).toFixed(2)}</span> },
    { accessorKey: 'life_certificate_status', header: 'Life Cert', meta: { label: 'Life Cert', width: 130 },
      cell: ({ getValue }) => String(getValue() ?? '—') },
  ];

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="t-page-title">Survivor Awards</h1>
        <p className="text-sm text-muted-foreground">
          Survivor benefit awards. One deceased insured person may have multiple beneficiaries — open the award to manage shares.
        </p>
      </div>
      <BNDataGrid<any>
        id="bn.survivor-awards"
        data={data ?? []}
        isLoading={isLoading}
        columns={columns}
        onRefresh={() => refetch()}
        onRowClick={(a) => navigate(`/bn/awards/${a.id}`)}
        defaultSort={[{ id: 'start_date', desc: true }]}
        exportFilename="bn_survivor_awards"
        searchPlaceholder="Search award # or SSN..."
        emptyMessage="No survivor awards."
        rowActions={[
          { key: 'view', label: 'Open', icon: <Eye className="h-3.5 w-3.5" />, onClick: (a) => navigate(`/bn/awards/${a.id}`) },
        ]}
      />
    </div>
  );
}
