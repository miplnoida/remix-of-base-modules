import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, CheckCircle2, DollarSign } from 'lucide-react';
import { CHART_COLORS, CHART_STYLES } from '@/lib/chartColors';

const mockData = {
  summary: { totalSubmissions: 567, paidCertificates: 89, unpaidCertificates: 12 },
  timeline: [
    { month: 'Jan', submissions: 102, paid: 15, unpaid: 2 },
    { month: 'Feb', submissions: 115, paid: 18, unpaid: 3 },
    { month: 'Mar', submissions: 108, paid: 17, unpaid: 2 },
    { month: 'Apr', submissions: 122, paid: 20, unpaid: 3 },
    { month: 'May', submissions: 120, paid: 19, unpaid: 2 }
  ],
  details: [
    { personId: 'IP-2024-001', name: 'John Smith', date: '2024-05-15', source: 'Online', paymentStatus: 'Free', officer: 'Officer A' },
    { personId: 'IP-2024-002', name: 'Maria Johnson', date: '2024-05-14', source: 'Counter', paymentStatus: 'Paid', officer: 'Officer B' },
    { personId: 'IP-2024-003', name: 'David Brown', date: '2024-05-13', source: 'Mail', paymentStatus: 'Unpaid', officer: 'Officer A' },
    { personId: 'IP-2024-004', name: 'Sarah Wilson', date: '2024-05-12', source: 'Online', paymentStatus: 'Free', officer: 'Officer C' }
  ]
};

export default function LifeCertificatesReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'paymentStatus', label: 'Payment Status', type: 'select' as const, options: [
      { label: 'Free', value: 'free' },
      { label: 'Paid', value: 'paid' },
      { label: 'Unpaid', value: 'unpaid' }
    ]},
    { name: 'officer', label: 'Officer', type: 'text' as const }
  ];

  return (
    <ReportLayout
      title="Life Certificates Submitted & Payment Status Report"
      subtitle="Track life certificate submissions and associated payments"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'Life Certificates' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Total Submissions" value={mockData.summary.totalSubmissions.toString()} icon={FileText} variant="info" />
          <MetricCard title="Paid Certificates" value={mockData.summary.paidCertificates.toString()} icon={DollarSign} variant="success" />
          <MetricCard title="Unpaid Certificates" value={mockData.summary.unpaidCertificates.toString()} icon={CheckCircle2} variant="warning" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Submissions Over Time</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockData.timeline}>
                  <CartesianGrid {...CHART_STYLES.grid} />
                  <XAxis dataKey="month" {...CHART_STYLES.axis} />
                  <YAxis {...CHART_STYLES.axis} />
                  <Tooltip {...CHART_STYLES.tooltip} />
                  <Legend />
                  <Line type="monotone" dataKey="submissions" stroke={CHART_COLORS.primary} name="Submissions" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Paid vs Unpaid</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockData.timeline}>
                  <CartesianGrid {...CHART_STYLES.grid} />
                  <XAxis dataKey="month" {...CHART_STYLES.axis} />
                  <YAxis {...CHART_STYLES.axis} />
                  <Tooltip {...CHART_STYLES.tooltip} />
                  <Legend />
                  <Bar dataKey="paid" fill={CHART_COLORS.primary} name="Paid" stackId="a" />
                  <Bar dataKey="unpaid" fill={CHART_COLORS.gold} name="Unpaid" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      }
      tableArea={
        <Card>
          <CardHeader><CardTitle>Life Certificate Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Officer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.details.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.personId}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.source}</TableCell>
                    <TableCell>
                      <span className={row.paymentStatus === 'Paid' ? 'text-primary font-semibold' : row.paymentStatus === 'Unpaid' ? 'text-accent font-semibold' : 'text-muted-foreground'}>
                        {row.paymentStatus}
                      </span>
                    </TableCell>
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
