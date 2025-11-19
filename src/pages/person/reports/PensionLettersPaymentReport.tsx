import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Mail, DollarSign, CheckCircle2 } from 'lucide-react';
import { CHART_COLORS, CHART_STYLES } from '@/lib/chartColors';

const mockData = {
  summary: { paidLetters: 89, freeLetters: 145, totalRevenue: 1780 },
  byStatus: [
    { name: 'Paid', value: 89 },
    { name: 'Free', value: 145 }
  ],
  byType: [
    { type: 'Age Benefit Letter', paid: 34, free: 56 },
    { type: 'Disability Letter', paid: 28, free: 45 },
    { type: 'Survivor Letter', paid: 27, free: 44 }
  ],
  details: [
    { personId: 'IP-2024-001', letterType: 'Age Benefit Letter', fee: 20.00, invoiceNo: 'INV-8001', status: 'Paid' },
    { personId: 'IP-2024-002', letterType: 'Disability Letter', fee: 20.00, invoiceNo: 'INV-8002', status: 'Paid' },
    { personId: 'IP-2024-003', letterType: 'Survivor Letter', fee: 0.00, invoiceNo: '-', status: 'Free' },
    { personId: 'IP-2024-004', letterType: 'Age Benefit Letter', fee: 20.00, invoiceNo: 'INV-8003', status: 'Paid' }
  ]
};

export default function PensionLettersPaymentReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'letterType', label: 'Letter Type', type: 'select' as const, options: [
      { label: 'Age Benefit', value: 'age' },
      { label: 'Disability', value: 'disability' },
      { label: 'Survivor', value: 'survivor' }
    ]},
    { name: 'officer', label: 'Officer', type: 'text' as const }
  ];

  return (
    <ReportLayout
      title="Pension Letters Payment Report (After Third Issuance)"
      subtitle="Track payments for pension letters after free limit"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'Pension Letters Payment' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Paid Letters" value={mockData.summary.paidLetters.toString()} icon={Mail} variant="success" />
          <MetricCard title="Free Letters" value={mockData.summary.freeLetters.toString()} icon={CheckCircle2} variant="info" />
          <MetricCard title="Total Revenue" value={`EC$${mockData.summary.totalRevenue.toLocaleString()}`} icon={DollarSign} variant="success" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Paid vs Free Letters</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={mockData.byStatus} cx="50%" cy="50%" labelLine={false} label={(entry) => `${entry.name}: ${entry.value}`} outerRadius={80} fill={CHART_COLORS.primary} dataKey="value">
                    <Cell fill={CHART_COLORS.primary} />
                    <Cell fill={CHART_COLORS.gray} />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Letters by Type</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockData.byType}>
                  <CartesianGrid {...CHART_STYLES.grid} />
                  <XAxis dataKey="type" {...CHART_STYLES.axis} angle={-15} textAnchor="end" height={80} />
                  <YAxis {...CHART_STYLES.axis} />
                  <Tooltip {...CHART_STYLES.tooltip} />
                  <Legend />
                  <Bar dataKey="paid" fill={CHART_COLORS.primary} name="Paid" />
                  <Bar dataKey="free" fill={CHART_COLORS.gray} name="Free" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      }
      tableArea={
        <Card>
          <CardHeader><CardTitle>Pension Letter Payment Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person ID</TableHead>
                  <TableHead>Letter Type</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.details.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.personId}</TableCell>
                    <TableCell>{row.letterType}</TableCell>
                    <TableCell>EC${row.fee.toFixed(2)}</TableCell>
                    <TableCell>{row.invoiceNo}</TableCell>
                    <TableCell><span className={row.status === 'Paid' ? 'text-[#009B4C] font-semibold' : 'text-[#64748B]'}>{row.status}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      }
      onExportCSV={() => console.log('Export CSV')}
      onExportPDF={() => console.log('Export PDF')}
    />
  );
}
