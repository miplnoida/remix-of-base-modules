import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, DollarSign, AlertCircle } from 'lucide-react';
import { CHART_COLORS, CHART_STYLES } from '@/lib/chartColors';

const mockData = {
  summary: { paidStatements: 145, unpaidStatements: 28, totalRevenue: 4350, personsOver3Statements: 58 },
  timeline: [
    { month: 'Jan', paid: 25, unpaid: 5 },
    { month: 'Feb', paid: 32, unpaid: 6 },
    { month: 'Mar', paid: 28, unpaid: 7 },
    { month: 'Apr', paid: 30, unpaid: 5 },
    { month: 'May', paid: 30, unpaid: 5 }
  ],
  details: [
    { personId: 'IP-2024-001', statementCount: 4, invoiceNo: 'INV-7001', fee: 30.00, status: 'Paid', officer: 'Officer A' },
    { personId: 'IP-2024-002', statementCount: 5, invoiceNo: 'INV-7002', fee: 30.00, status: 'Unpaid', officer: 'Officer B' },
    { personId: 'IP-2024-003', statementCount: 6, invoiceNo: 'INV-7003', fee: 30.00, status: 'Paid', officer: 'Officer A' },
    { personId: 'IP-2024-004', statementCount: 4, invoiceNo: 'INV-7004', fee: 30.00, status: 'Paid', officer: 'Officer C' }
  ]
};

export default function ContributionStatementPaymentReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'officer', label: 'Officer', type: 'text' as const },
    { name: 'paymentStatus', label: 'Payment Status', type: 'select' as const, options: [
      { label: 'Paid', value: 'paid' },
      { label: 'Unpaid', value: 'unpaid' }
    ]}
  ];

  return (
    <ReportLayout
      title="Contribution Statement Payment Report (After Third Issuance)"
      subtitle="Track paid re-issued contribution statements after free limit"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'Contribution Statement Payment' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Paid Statements" value={mockData.summary.paidStatements.toString()} icon={FileText} variant="success" />
          <MetricCard title="Unpaid Statements" value={mockData.summary.unpaidStatements.toString()} icon={AlertCircle} variant="warning" />
          <MetricCard title="Total Revenue" value={`EC$${mockData.summary.totalRevenue.toLocaleString()}`} icon={DollarSign} variant="success" />
          <MetricCard title="Persons >3 Statements" value={mockData.summary.personsOver3Statements.toString()} icon={FileText} variant="info" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Paid vs Unpaid Over Time</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockData.timeline}>
                  <CartesianGrid {...CHART_STYLES.grid} />
                  <XAxis dataKey="month" {...CHART_STYLES.axis} />
                  <YAxis {...CHART_STYLES.axis} />
                  <Tooltip {...CHART_STYLES.tooltip} />
                  <Legend />
                  <Line type="monotone" dataKey="paid" stroke={CHART_COLORS.primary} name="Paid" strokeWidth={2} />
                  <Line type="monotone" dataKey="unpaid" stroke={CHART_COLORS.gold} name="Unpaid" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Statement Issuances</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockData.timeline}>
                  <CartesianGrid {...CHART_STYLES.grid} />
                  <XAxis dataKey="month" {...CHART_STYLES.axis} />
                  <YAxis {...CHART_STYLES.axis} />
                  <Tooltip {...CHART_STYLES.tooltip} />
                  <Legend />
                  <Bar dataKey="paid" fill={CHART_COLORS.primary} name="Paid" />
                  <Bar dataKey="unpaid" fill={CHART_COLORS.gold} name="Unpaid" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      }
      tableArea={
        <Card>
          <CardHeader><CardTitle>Statement Payment Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person ID</TableHead>
                  <TableHead>Statement Count</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Officer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.details.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.personId}</TableCell>
                    <TableCell>{row.statementCount}</TableCell>
                    <TableCell>{row.invoiceNo}</TableCell>
                    <TableCell>EC${row.fee.toFixed(2)}</TableCell>
                    <TableCell><span className={row.status === 'Paid' ? 'text-[#009B4C] font-semibold' : 'text-[#F59E0B] font-semibold'}>{row.status}</span></TableCell>
                    <TableCell>{row.officer}</TableCell>
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
