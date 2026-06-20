import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, FileText, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { LgDataGrid, LgStatusBadge, buildLgRowActions, type LgColumnDef } from '@/components/legal/grid';
import { mockLegalRequisitions } from '@/data/mockLegalIntake';

type Requisition = (typeof mockLegalRequisitions)[number];

export default function CaseIntake() {
  const navigate = useNavigate();

  const pendingCount = mockLegalRequisitions.filter((r) => r.status === 'Pending Review').length;
  const infoRequestedCount = mockLegalRequisitions.filter((r) => r.status === 'Info Requested').length;

  const columns: LgColumnDef<Requisition>[] = useMemo(() => [
    { accessorKey: 'intakeId', header: 'Intake ID', meta: { label: 'Intake ID', pinLeft: true } },
    {
      accessorKey: 'caseNumber',
      header: 'Case No.',
      meta: { label: 'Case No.' },
      cell: ({ getValue }) => {
        const v = getValue() as string | undefined;
        return v ? <span className="font-medium text-primary">{v}</span> : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: 'submissionDate',
      header: 'Date',
      meta: { label: 'Date' },
      cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString(),
    },
    {
      id: 'employer',
      accessorFn: (r) => r.employer.name,
      header: 'Employer',
      meta: { label: 'Employer', exportValue: (r: any) => r.employer?.name },
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.employer.name}</div>
          <div className="text-xs text-muted-foreground">{row.original.employer.registrationNumber}</div>
        </div>
      ),
    },
    { accessorKey: 'reason', header: 'Reason', meta: { label: 'Reason' } },
    { accessorKey: 'period', header: 'Period', meta: { label: 'Period' } },
    {
      accessorKey: 'amount',
      header: 'Amount',
      meta: { label: 'Amount', align: 'right' },
      cell: ({ getValue }) => <span className="font-medium">${(getValue() as number).toLocaleString()}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      meta: { label: 'Status' },
      cell: ({ getValue }) => <LgStatusBadge status={getValue() as string} />,
    },
    { accessorKey: 'submittedBy', header: 'Submitted By', meta: { label: 'Submitted By' } },
  ], []);

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Case Intake</h1>
          <p className="text-muted-foreground">Review and process legal action requisitions</p>
        </div>
        <div className="flex gap-4">
          <Card className="p-4 border-warning/20 bg-warning/5">
            <div className="flex items-center gap-2 text-warning">
              <FileText className="h-5 w-5" />
              <div>
                <div className="text-xs font-medium">Pending Review</div>
                <div className="text-2xl font-bold">{pendingCount}</div>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-info/20 bg-info/5">
            <div className="flex items-center gap-2 text-info">
              <MessageSquare className="h-5 w-5" />
              <div>
                <div className="text-xs font-medium">Info Requested</div>
                <div className="text-2xl font-bold">{infoRequestedCount}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <LgDataGrid
        id="lg.case-intake"
        columns={columns}
        data={mockLegalRequisitions}
        searchPlaceholder="Search requisitions…"
        exportFilename="legal-case-intake"
        defaultSort={[{ id: 'submissionDate', desc: true }]}
        summary={[
          { label: 'Total', value: mockLegalRequisitions.length, tone: 'default' },
          { label: 'Pending Review', value: pendingCount, tone: 'warning' },
          { label: 'Info Requested', value: infoRequestedCount, tone: 'info' },
        ]}
        toolbarFilters={[
          {
            key: 'status',
            label: 'Status',
            options: [
              { value: 'Pending Review', label: 'Pending Review' },
              { value: 'Info Requested', label: 'Info Requested' },
              { value: 'Accepted', label: 'Accepted' },
              { value: 'Rejected', label: 'Rejected' },
            ],
          },
        ]}
        rowActions={buildLgRowActions({
          onView: (row: Requisition) => navigate(`/legal/cases/intake/${row.id}`),
          extra: [{ key: 'open', label: 'Open', icon: <Eye className="h-4 w-4" />, onClick: (row: Requisition) => navigate(`/legal/cases/intake/${row.id}`) }],
        })}
        onRowClick={(row) => navigate(`/legal/cases/intake/${row.id}`)}
        emptyMessage="No legal action requisitions."
      />
    </div>
  );
}
