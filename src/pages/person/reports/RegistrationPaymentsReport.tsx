import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, FileText, AlertCircle } from 'lucide-react';
import { CHART_COLORS, CHART_STYLES } from '@/lib/chartColors';

const mockData = {
  summary: { totalPayments: 487, totalRevenue: 12450, unpaidInvoices: 23 },
  timeline: [
    { month: 'Jan', payments: 89, revenue: 2340 },
    { month: 'Feb', payments: 95, revenue: 2450 },
    { month: 'Mar', payments: 102, revenue: 2680 },
    { month: 'Apr', payments: 98, revenue: 2530 },
    { month: 'May', payments: 103, revenue: 2450 }
  ],
  byType: [
    { name: 'New Registration', value: 280 },
    { name: 'Renewal', value: 134 },
    { name: 'Update', value: 73 }
  ],
  details: [
    { personId: 'IP-2024-001', regType: 'New Registration', invoiceNo: 'INV-5001', amount: 25.00, paymentStatus: 'Paid', officer: 'Officer A' },
    { personId: 'IP-2024-002', regType: 'Renewal', invoiceNo: 'INV-5002', amount: 20.00, paymentStatus: 'Paid', officer: 'Officer B' },
    { personId: 'IP-2024-003', regType: 'Update', invoiceNo: 'INV-5003', amount: 15.00, paymentStatus: 'Unpaid', officer: 'Officer A' },
    { personId: 'IP-2024-004', regType: 'New Registration', invoiceNo: 'INV-5004', amount: 25.00, paymentStatus: 'Paid', officer: 'Officer C' }
  ]
};

export default function RegistrationPaymentsReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'paymentStatus', label: 'Payment Status', type: 'select' as const, options: [
      { label: 'Paid', value: 'paid' },
      { label: 'Unpaid', value: 'unpaid' }
    ]},
    { name: 'officer', label: 'Officer', type: 'text' as const },
    { name: 'registrationType', label: 'Registration Type', type: 'select' as const, options: [
      { label: 'New Registration', value: 'new' },
      { label: 'Renewal', value: 'renewal' },
      { label: 'Update', value: 'update' }
    ]}
  ];

  return (
    <ReportLayout
      title="Insured Persons With Related Registration Payments Report"
      subtitle="Track payments tied to insured person registrations"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'Registration Payments' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Total Payments" value={mockData.summary.totalPayments.toString()} icon={FileText} variant="info" />
          <MetricCard title="Total Revenue" value={`EC$${mockData.summary.totalRevenue.toLocaleString()}`} icon={DollarSign} variant="success" />
          <MetricCard title="Unpaid Invoices" value={mockData.summary.unpaidInvoices.toString()} icon={AlertCircle} variant="warning" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Payments Over Time</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockData.timeline}>
                  <CartesianGrid {...CHART_STYLES.grid} />
                  <XAxis dataKey="month" {...CHART_STYLES.axis} />
                  <YAxis {...CHART_STYLES.axis} />
                  <Tooltip {...CHART_STYLES.tooltip} />
                  <Bar dataKey="payments" fill={CHART_COLORS.primary} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Payment by Type</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={mockData.byType} cx="50%" cy="50%" labelLine={false} label={(entry) => `${entry.name}: ${entry.value}`} outerRadius={80} fill={CHART_COLORS.primary} dataKey="value">
                    <Cell fill={CHART_COLORS.primary} />
                    <Cell fill={CHART_COLORS.blue} />
                    <Cell fill={CHART_COLORS.teal} />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      }
      tableArea={
        <Card>
          <CardHeader><CardTitle>Registration Payment Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person ID</TableHead>
                  <TableHead>Reg Type</TableHead>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Officer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.details.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.personId}</TableCell>
                    <TableCell>{row.regType}</TableCell>
                    <TableCell>{row.invoiceNo}</TableCell>
                    <TableCell>EC${row.amount.toFixed(2)}</TableCell>
                    <TableCell><span className={row.paymentStatus === 'Paid' ? 'text-[#009B4C] font-semibold' : 'text-[#F59E0B] font-semibold'}>{row.paymentStatus}</span></TableCell>
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
