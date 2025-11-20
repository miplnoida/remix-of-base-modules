import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, MapPin, Building2, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const chartData = [
  { zone: 'Zone 1', employers: 145, employees: 5420 },
  { zone: 'Zone 2', employers: 182, employees: 6850 },
  { zone: 'Zone 3', employers: 98, employees: 3680 },
  { zone: 'Zone 4', employers: 76, employees: 2890 }
];

const mockData = [
  { id: 'EMP-101', name: 'Central Hotels Group', zone: 'Zone 1', employees: 425, rank: 1 },
  { id: 'EMP-102', name: 'North Manufacturing', zone: 'Zone 2', employees: 512, rank: 1 },
  { id: 'EMP-103', name: 'South Construction', zone: 'Zone 3', employees: 298, rank: 1 },
  { id: 'EMP-104', name: 'East Transport Co', zone: 'Zone 4', employees: 234, rank: 1 },
  { id: 'EMP-105', name: 'West Retail Chain', zone: 'Zone 2', employees: 385, rank: 2 }
];

export default function EmployeesPerZoneReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' },
      { label: 'Zone 4', value: 'zone4' }
    ]},
    { name: 'employmentSize', label: 'Size Category', type: 'select' as const, options: [
      { label: 'All Sizes', value: 'all' },
      { label: 'Small (1-20)', value: 'small' },
      { label: 'Medium (21-50)', value: 'medium' },
      { label: 'Large (51+)', value: 'large' }
    ]}
  ];

  return (
    <ReportLayout
      title="Top Employers Based on Number of Employees Per Zone"
      subtitle="Largest employers in each zone by employee count"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Employees Per Zone' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Zones" value="4" icon={MapPin} variant="info" />
          <MetricCard title="Total Employers" value="501" icon={Building2} variant="info" />
          <MetricCard title="Total Employees" value="18,840" icon={Users} variant="success" />
          <MetricCard title="Largest Zone" value="Zone 2 (6,850)" icon={TrendingUp} variant="success" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Employee Distribution by Zone</CardTitle>
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
                <Bar dataKey="employees" fill="#2563EB" name="Employees" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Top Employers by Employee Count Per Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone Rank</TableHead>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Employees</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-bold">{row.rank}</TableCell>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.zone}</TableCell>
                    <TableCell className="font-semibold">{row.employees}</TableCell>
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
