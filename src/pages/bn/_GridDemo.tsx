/**
 * BN Grid demo — internal QA route at /bn/_grid-demo.
 * Use to validate paging/sort/filter/columns/export without touching live screens.
 */
import React, { useMemo, useState } from 'react';
import { BNDataGrid, BNGridSidePanel, type BNColumnDef } from '@/components/bn/grid';
import { Badge } from '@/components/ui/badge';
import { Eye, Pencil, Copy, Trash2 } from 'lucide-react';

interface Demo {
  id: string;
  code: string;
  name: string;
  status: 'ACTIVE' | 'DRAFT' | 'RETIRED';
  modifiedAt: string;
  owner: string;
  version: number;
}

function seed(n: number): Demo[] {
  const statuses: Demo['status'][] = ['ACTIVE', 'DRAFT', 'RETIRED'];
  return Array.from({ length: n }).map((_, i) => ({
    id: `r-${i + 1}`,
    code: `RULE-${String(i + 1).padStart(4, '0')}`,
    name: `Demo rule item #${i + 1}`,
    status: statuses[i % statuses.length],
    modifiedAt: new Date(Date.now() - i * 86400000).toISOString(),
    owner: ['Alice', 'Bob', 'Charlie', 'Dee'][i % 4],
    version: (i % 5) + 1,
  }));
}

const BNGridDemo: React.FC = () => {
  const data = useMemo(() => seed(437), []);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Demo | null>(null);

  const filtered = useMemo(
    () => (statusFilter ? data.filter((d) => d.status === statusFilter) : data),
    [data, statusFilter],
  );

  const columns: BNColumnDef<Demo>[] = [
    { accessorKey: 'code', header: 'Code', meta: { label: 'Code', pinLeft: true, width: 140 } },
    { accessorKey: 'name', header: 'Name', meta: { label: 'Name', width: 320 } },
    {
      accessorKey: 'status',
      header: 'Status',
      meta: { label: 'Status', width: 120 },
      cell: ({ getValue }) => {
        const s = getValue<Demo['status']>();
        const tone = s === 'ACTIVE' ? 'default' : s === 'DRAFT' ? 'secondary' : 'outline';
        return <Badge variant={tone}>{s}</Badge>;
      },
    },
    { accessorKey: 'owner', header: 'Owner', meta: { label: 'Owner', width: 140 } },
    { accessorKey: 'version', header: 'Ver.', meta: { label: 'Version', align: 'right', width: 70 } },
    {
      accessorKey: 'modifiedAt',
      header: 'Last Modified',
      meta: { label: 'Last Modified', width: 160 },
      cell: ({ getValue }) => new Date(getValue<string>()).toLocaleString(),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="t-page-title">BNDataGrid — demo</h1>
        <p className="t-page-subtitle mt-1">Internal QA route. Validate paging, sort, filter, columns, resize, export.</p>
      </div>

      <BNDataGrid
        id="bn.demo"
        columns={columns}
        data={filtered}
        defaultSort={[{ id: 'modifiedAt', desc: true }]}
        searchPlaceholder="Search code, name, owner..."
        summary={[
          { label: 'Total', value: data.length, tone: 'default' },
          { label: 'Active', value: data.filter((d) => d.status === 'ACTIVE').length, tone: 'success' },
          { label: 'Draft', value: data.filter((d) => d.status === 'DRAFT').length, tone: 'warning' },
          { label: 'Retired', value: data.filter((d) => d.status === 'RETIRED').length, tone: 'muted' },
        ]}
        toolbarFilters={[{
          key: 'status',
          label: 'Status',
          value: statusFilter,
          onChange: setStatusFilter,
          options: [
            { value: 'ACTIVE', label: 'Active' },
            { value: 'DRAFT', label: 'Draft' },
            { value: 'RETIRED', label: 'Retired' },
          ],
        }]}
        rowActions={[
          { key: 'view', label: 'View', icon: <Eye className="h-3.5 w-3.5" />, onClick: (r) => setSelected(r) },
          { key: 'edit', label: 'Edit', icon: <Pencil className="h-3.5 w-3.5" />, onClick: (r) => setSelected(r) },
          { key: 'clone', label: 'Clone', icon: <Copy className="h-3.5 w-3.5" />, onClick: () => {} },
          { key: 'delete', label: 'Delete', icon: <Trash2 className="h-3.5 w-3.5" />, variant: 'destructive', onClick: () => {} },
        ]}
        bulkActions={[
          { key: 'activate', label: 'Activate', onClick: () => {} },
          { key: 'retire', label: 'Retire', variant: 'destructive', onClick: () => {} },
        ]}
        onRowClick={(r) => setSelected(r)}
        onCreate={() => alert('Create')}
        onImport={() => alert('Import')}
        onRefresh={() => alert('Refresh')}
        exportFilename="bn_demo"
      />

      <BNGridSidePanel
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected?.code ?? ''}
        description={selected?.name}
      >
        <pre className="text-xs">{JSON.stringify(selected, null, 2)}</pre>
      </BNGridSidePanel>
    </div>
  );
};

export default BNGridDemo;
