import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { XCircle, MapPin, DollarSign, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const chartData = [
  { zone: 'Zone 1', employers: 8, c3Count: 32, amountDue: 58000 },
  { zone: 'Zone 2', employers: 11, c3Count: 45, amountDue: 78500 },
  { zone: 'Zone 3', employers: 5, c3Count: 21, amountDue: 42600 },
  { zone: 'Zone 4', employers: 4, c3Count: 18, amountDue: 35200 }
];

const mockData = [
  { id: 'EMP-301', name: 'Central Trading', zone: 'Zone 1', c3Count: 7, amountDue: 45000, lastSubmission: '2024-03-15' },
  { id: 'EMP-302', name: 'North Services', zone: 'Zone 2', c3Count: 9, amountDue: 62400, lastSubmission: '2024-03-20' },
  { id: 'EMP-303', name: 'South Imports', zone: 'Zone 3', c3Count: 5, amountDue: 28900, lastSubmission: '2024-04-01' },
  { id: 'EMP-304', name: 'East Manufacturing', zone: 'Zone 4', c3Count: 6, amountDue: 38200, lastSubmission: '2024-03-25' },
  { id: 'EMP-305', name: 'West Retail', zone: 'Zone 1', c3Count: 4, amountDue: 21500, lastSubmission: '2024-04-05' }
];

export default function NoPaymentPerZoneReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' },
      { label: 'Zone 4', value: 'zone4' }
    ]}
  ];

  return (
    <ReportLayout
      title="Top Employers Without Payment Per Zone"
      subtitle="C3 submissions without payment analyzed by zone"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'No Payment Per Zone' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Zones" value="4" icon={MapPin} variant="info" />
          <MetricCard title="Employers Affected" value="28" icon={Building2} variant="warning" />
          <MetricCard title="Total C3 Count" value="116" icon={XCircle} variant="warning" />
          <MetricCard title="Total Amount Due" value="EC$ 214,300" icon={DollarSign} variant="error" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>C3 Without Payment by Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="zone" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Legend />
                <Bar dataKey="employers" fill="#009B4C" name="Employers" radius={[8, 8, 0, 0]} />
                <Bar dataKey="c3Count" fill="#F59E0B" name="C3 Count" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Employers Without Payment Per Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>C3 Count</TableHead>
                  <TableHead>Amount Due (EC$)</TableHead>
                  <TableHead>Last Submission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.zone}</TableCell>
                    <TableCell>{row.c3Count}</TableCell>
                    <TableCell>{row.amountDue.toLocaleString()}</TableCell>
                    <TableCell>{row.lastSubmission}</TableCell>
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
