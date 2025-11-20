import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare, MapPin, AlertCircle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const chartData = [
  { zone: 'Zone 1', employers: 15, queries: 78, resolved: 62 },
  { zone: 'Zone 2', employers: 19, queries: 95, resolved: 78 },
  { zone: 'Zone 3', employers: 11, queries: 54, resolved: 45 },
  { zone: 'Zone 4', employers: 8, queries: 38, resolved: 32 }
];

const mockData = [
  { id: 'EMP-601', name: 'Hotels Group', zone: 'Zone 1', queries: 28, resolved: 24, pending: 4 },
  { id: 'EMP-602', name: 'Manufacturing Co', zone: 'Zone 2', queries: 24, resolved: 20, pending: 4 },
  { id: 'EMP-603', name: 'Construction Ltd', zone: 'Zone 3', queries: 19, resolved: 16, pending: 3 },
  { id: 'EMP-604', name: 'Retail Stores', zone: 'Zone 1', queries: 16, resolved: 14, pending: 2 },
  { id: 'EMP-605', name: 'Transport Services', zone: 'Zone 2', queries: 14, resolved: 12, pending: 2 }
];

export default function QueriesPerZoneReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' },
      { label: 'Zone 4', value: 'zone4' }
    ]},
    { name: 'queryType', label: 'Query Type', type: 'select' as const, options: [
      { label: 'All Types', value: 'all' },
      { label: 'Overpayment', value: 'overpayment' },
      { label: 'Underpayment', value: 'underpayment' },
      { label: 'SSN Mismatch', value: 'ssn_mismatch' }
    ]},
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const }
  ];

  return (
    <ReportLayout
      title="Top Employers With Most C3 Queries Per Zone"
      subtitle="C3 query distribution analyzed by zone"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Queries Per Zone' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Zones" value="4" icon={MapPin} variant="info" />
          <MetricCard title="Total Queries" value="265" icon={MessageSquare} variant="warning" />
          <MetricCard title="Resolved" value="217" icon={TrendingUp} variant="success" />
          <MetricCard title="Pending" value="48" icon={AlertCircle} variant="error" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>C3 Queries by Zone</CardTitle>
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
                <Bar dataKey="queries" fill="#2563EB" name="Queries" radius={[8, 8, 0, 0]} />
                <Bar dataKey="resolved" fill="#0EA5E9" name="Resolved" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Employers With Queries by Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Total Queries</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.zone}</TableCell>
                    <TableCell className="font-semibold">{row.queries}</TableCell>
                    <TableCell className="text-green-600">{row.resolved}</TableCell>
                    <TableCell className="text-orange-600">{row.pending}</TableCell>
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
