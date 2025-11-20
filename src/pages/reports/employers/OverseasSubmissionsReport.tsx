import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Globe, DollarSign, MapPin, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { country: 'USA', submissions: 28, amount: 845000 },
  { country: 'Canada', submissions: 22, amount: 678000 },
  { country: 'UK', submissions: 18, amount: 556000 },
  { country: 'Caribbean', submissions: 15, amount: 445000 }
];

const mockData = [
  { id: 'EMP-2501', name: 'International Hotels Corp', country: 'USA', paymentMethod: 'Wire Transfer', lastSubmission: '2024-03-15', contributionAmount: 85000, zone: 'Zone 1' },
  { id: 'EMP-2502', name: 'Global Manufacturing', country: 'Canada', paymentMethod: 'ACH', lastSubmission: '2024-03-20', contributionAmount: 72000, zone: 'Zone 2' },
  { id: 'EMP-2503', name: 'UK Services Ltd', country: 'UK', paymentMethod: 'Swift Transfer', lastSubmission: '2024-03-10', contributionAmount: 68000, zone: 'Zone 3' },
  { id: 'EMP-2504', name: 'Caribbean Enterprises', country: 'Trinidad', paymentMethod: 'Regional Transfer', lastSubmission: '2024-03-18', contributionAmount: 55000, zone: 'Zone 1' },
  { id: 'EMP-2505', name: 'American Transport Co', country: 'USA', paymentMethod: 'Wire Transfer', lastSubmission: '2024-03-22', contributionAmount: 62000, zone: 'Zone 2' }
];

export default function OverseasSubmissionsReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'country', label: 'Country', type: 'select' as const, options: [
      { label: 'All Countries', value: 'all' },
      { label: 'USA', value: 'usa' },
      { label: 'Canada', value: 'canada' },
      { label: 'UK', value: 'uk' },
      { label: 'Caribbean', value: 'caribbean' }
    ]},
    { name: 'paymentMethod', label: 'Payment Method', type: 'select' as const, options: [
      { label: 'All Methods', value: 'all' },
      { label: 'Wire Transfer', value: 'wire' },
      { label: 'ACH', value: 'ach' },
      { label: 'Swift', value: 'swift' }
    ]},
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const }
  ];

  return (
    <ReportLayout
      title="Employers Submitting Contributions From Overseas"
      subtitle="Employers making international contribution payments"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Overseas Submissions' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Submissions" value="83" icon={Globe} variant="info" />
          <MetricCard title="Total Amount" value="EC$ 2,524,000" icon={DollarSign} variant="success" />
          <MetricCard title="Countries" value="12" icon={MapPin} variant="info" />
          <MetricCard title="Avg Contribution" value="EC$ 30,410" icon={TrendingUp} variant="success" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Overseas Submissions by Country</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="country" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="submissions" fill="#2563EB" name="Submissions" radius={[8, 8, 0, 0]} />
                <Bar dataKey="amount" fill="#009B4C" name="Amount (EC$)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Overseas Contribution Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Last Submission</TableHead>
                  <TableHead>Contribution (EC$)</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.country}</TableCell>
                    <TableCell>{row.paymentMethod}</TableCell>
                    <TableCell>{row.lastSubmission}</TableCell>
                    <TableCell className="font-semibold text-green-600">{row.contributionAmount.toLocaleString()}</TableCell>
                    <TableCell>{row.zone}</TableCell>
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
