import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileX, MapPin, Building2, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const chartData = [
  { zone: 'Zone 1', employers: 12, missing: 45 },
  { zone: 'Zone 2', employers: 15, missing: 58 },
  { zone: 'Zone 3', employers: 9, missing: 32 },
  { zone: 'Zone 4', employers: 8, missing: 28 }
];

const mockData = [
  { id: 'EMP-101', name: 'Central Trading Ltd', zone: 'Zone 1', lastSubmission: '2024-01-15', missingMonths: 5, employees: 42 },
  { id: 'EMP-102', name: 'North Services Co', zone: 'Zone 2', lastSubmission: '2024-02-10', missingMonths: 4, employees: 38 },
  { id: 'EMP-103', name: 'South Imports', zone: 'Zone 3', lastSubmission: '2024-02-20', missingMonths: 4, employees: 29 },
  { id: 'EMP-104', name: 'East Manufacturing', zone: 'Zone 4', lastSubmission: '2024-03-01', missingMonths: 3, employees: 51 },
  { id: 'EMP-105', name: 'West Retail Group', zone: 'Zone 1', lastSubmission: '2024-03-05', missingMonths: 3, employees: 34 }
];

export default function MissingC3PerZoneReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' },
      { label: 'Zone 4', value: 'zone4' }
    ]},
    { name: 'industry', label: 'Industry', type: 'text' as const }
  ];

  return (
    <ReportLayout
      title="Top 20 Employers Not Submitting C3s Per Zone"
      subtitle="Missing C3 submissions analyzed by geographical zone"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Missing C3 Per Zone' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Zones" value="4" icon={MapPin} variant="info" />
          <MetricCard title="Employers Affected" value="44" icon={Building2} variant="warning" />
          <MetricCard title="Total Missing C3s" value="163" icon={FileX} variant="error" />
          <MetricCard title="Highest Zone" value="Zone 2 (58)" icon={AlertTriangle} variant="error" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Missing C3 Submissions by Zone</CardTitle>
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
                <Bar dataKey="missing" fill="#E74C3C" name="Missing C3s" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Employers with Missing C3s by Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Last Submission</TableHead>
                  <TableHead>Missing Months</TableHead>
                  <TableHead>Employees</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.zone}</TableCell>
                    <TableCell>{row.lastSubmission}</TableCell>
                    <TableCell>{row.missingMonths}</TableCell>
                    <TableCell>{row.employees}</TableCell>
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
