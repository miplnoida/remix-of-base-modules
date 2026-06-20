import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLegalCases } from '@/hooks/useLegalCases';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { LgDataGrid, LgStatusBadge, buildLgRowActions, type LgColumnDef } from '@/components/legal/grid';

const FINAL_STATUSES = ['Order Issued', 'Judgment Delivered', 'Closed - Compliant', 'Closed - Non-Compliant'];

interface OrderRow {
  id: string;
  orderNumber: string;
  number: string;
  title: string;
  case_type: string;
  status: string;
  orderDate: string;
  orderType: string;
  employer: string;
  totalDue: number;
  outstanding: number;
  updated_at: string;
}

export default function LegalOrderRegistry() {
  const navigate = useNavigate();

  const [caseType, setCaseType] = useState('');
  const [orderType, setOrderType] = useState('');
  const [status, setStatus] = useState('');
  const [employer, setEmployer] = useState('');

  const { data: cases, isLoading } = useLegalCases();

  const finalizedCases = useMemo<OrderRow[]>(() => {
    if (!cases) return [];
    return cases
      .filter((c) => FINAL_STATUSES.includes(c.status))
      .map((c) => ({
        ...c,
        orderNumber: `ORD-2025-${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`,
        orderDate: c.updated_at || c.created_at,
        orderType:
          c.case_type === 'Prosecution'
            ? 'Judgment Order'
            : c.case_type === 'Compliance'
            ? 'Compliance Order'
            : 'Settlement Order',
        employer: c.title.includes('Caribbean Resort')
          ? 'Caribbean Resort Ltd'
          : c.title.includes('ABC')
          ? 'ABC Construction'
          : 'N/A',
        totalDue: Math.floor(Math.random() * 200000) + 50000,
        outstanding: Math.floor(Math.random() * 100000),
      }));
  }, [cases]);

  const filteredOrders = useMemo(() => {
    return finalizedCases.filter((order) => {
      if (caseType && order.case_type !== caseType) return false;
      if (orderType && order.orderType !== orderType) return false;
      if (status && order.status !== status) return false;
      if (employer && order.employer !== employer) return false;
      return true;
    });
  }, [finalizedCases, caseType, orderType, status, employer]);

  const summary = useMemo(() => [
    { label: 'Total Orders', value: finalizedCases.length, tone: 'default' as const },
    { label: 'Judgment', value: finalizedCases.filter((o) => o.orderType === 'Judgment Order').length, tone: 'info' as const },
    { label: 'Compliant', value: finalizedCases.filter((o) => o.status === 'Closed - Compliant').length, tone: 'success' as const },
    { label: 'Non-Compliant', value: finalizedCases.filter((o) => o.status === 'Closed - Non-Compliant').length, tone: 'danger' as const },
  ], [finalizedCases]);

  const columns: LgColumnDef<OrderRow>[] = useMemo(() => [
    { accessorKey: 'orderNumber', header: 'Order Number', meta: { label: 'Order Number', pinLeft: true, width: 160 } },
    { accessorKey: 'number', header: 'Case Number', meta: { label: 'Case Number', width: 160 } },
    { accessorKey: 'title', header: 'Case Title', meta: { label: 'Case Title', width: 220 } },
    {
      accessorKey: 'case_type', header: 'Case Type', meta: { label: 'Case Type', width: 130 },
    },
    {
      accessorKey: 'status', header: 'Status', meta: { label: 'Status', width: 180 },
      cell: ({ getValue }) => <LgStatusBadge status={getValue<string>()} />,
    },
    {
      accessorKey: 'orderDate', header: 'Order Date', meta: { label: 'Order Date', width: 130 },
      cell: ({ getValue }) => {
        const v = getValue<string>();
        try { return format(new Date(v), 'MMM dd, yyyy'); } catch { return v; }
      },
    },
    { accessorKey: 'orderType', header: 'Order Type', meta: { label: 'Order Type', width: 160 } },
    { accessorKey: 'employer', header: 'Employer', meta: { label: 'Employer', width: 180 } },
    {
      accessorKey: 'totalDue', header: 'Total Due', meta: { label: 'Total Due', align: 'right', width: 130 },
      cell: ({ getValue }) => `$${getValue<number>().toLocaleString()}`,
    },
    {
      accessorKey: 'outstanding', header: 'Outstanding', meta: { label: 'Outstanding', align: 'right', width: 130 },
      cell: ({ getValue }) => `$${getValue<number>().toLocaleString()}`,
    },
    {
      accessorKey: 'updated_at', header: 'Updated On', meta: { label: 'Updated On', width: 130 },
      cell: ({ getValue }) => {
        const v = getValue<string>();
        try { return format(new Date(v), 'MMM dd, yyyy'); } catch { return v; }
      },
    },
  ], []);

  return (
    <div className="min-h-screen p-6 space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Order Registry</h1>
        <p className="text-muted-foreground mt-2">View final orders and judgments for closed cases</p>
      </div>

      <LgDataGrid
        id="lg.order-registry"
        columns={columns}
        data={filteredOrders}
        isLoading={isLoading}
        searchPlaceholder="Search order number, case number, title, employer…"
        summary={summary}
        defaultSort={[{ id: 'orderDate', desc: true }]}
        toolbarFilters={[
          {
            key: 'caseType', label: 'Case Type', value: caseType, onChange: setCaseType,
            options: ['Prosecution', 'Compliance', 'Appeal', 'Recovery'].map((v) => ({ value: v, label: v })),
          },
          {
            key: 'orderType', label: 'Order Type', value: orderType, onChange: setOrderType,
            options: ['Judgment Order', 'Settlement Order', 'Compliance Order'].map((v) => ({ value: v, label: v })),
          },
          {
            key: 'status', label: 'Status', value: status, onChange: setStatus,
            options: FINAL_STATUSES.map((v) => ({ value: v, label: v })),
          },
          {
            key: 'employer', label: 'Employer', value: employer, onChange: setEmployer,
            options: ['Caribbean Resort Ltd', 'ABC Construction'].map((v) => ({ value: v, label: v })),
          },
        ]}
        rowActions={[
          ...buildLgRowActions<OrderRow>({ onView: (r) => navigate(`/legal/cases/${r.id}`) }),
          {
            key: 'download', label: 'Download', icon: <Download className="h-3.5 w-3.5" />,
            onClick: (r) => console.log('Downloading order:', r.orderNumber),
          },
          {
            key: 'share', label: 'Share', icon: <Share2 className="h-3.5 w-3.5" />,
            onClick: () => { /* share */ },
          },
        ]}
        emptyMessage="No final orders available. Orders appear once cases reach a final status."
        exportFilename="legal-order-registry"
      />
    </div>
  );
}
