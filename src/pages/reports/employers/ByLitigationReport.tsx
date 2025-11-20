import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Scale, AlertTriangle, FileText, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { employer: 'Hotels Group', cases: 8, pending: 5, closed: 3 },
  { employer: 'Manufacturing', cases: 6, pending: 4, closed: 2 },
  { employer: 'Construction', cases: 5, pending: 3, closed: 2 },
  { employer: 'Retail Chain', cases: 4, pending: 2, closed: 2 },
  { employer: 'Transport Co', cases: 3, pending: 2, closed: 1 }
];

const mockData = [
  { id: 'EMP-701', name: 'Hotels Group International', cases: 8, pending: 5, closed: 3, totalAmount: 450000, zone: 'Zone 1' },
  { id: 'EMP-702', name: 'Manufacturing Solutions', cases: 6, pending: 4, closed: 2, totalAmount: 385000, zone: 'Zone 2' },
  { id: 'EMP-703', name: 'Construction Works Ltd', cases: 5, pending: 3, closed: 2, totalAmount: 320000, zone: 'Zone 3' },
  { id: 'EMP-704', name: 'Retail Chain Stores', cases: 4, pending: 2, closed: 2, totalAmount: 275000, zone: 'Zone 1' },
  { id: 'EMP-705', name: 'Transport Co Ltd', cases: 3, pending: 2, closed: 1, totalAmount: 220000, zone: 'Zone 2' }
];

export default function ByLitigationReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' }
    ]},
    { name: 'caseStatus', label: 'Case Status', type: 'select' as const, options: [
      { label: 'All Status', value: 'all' },
      { label: 'Pending', value: 'pending' },
      { label: 'Closed', value: 'closed' }
    ]}
  ];

  return (
    <ReportLayout
      title="Top Employers Based on Litigation Count"
      subtitle="Employers with highest number of litigation cases"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'By Litigation Count' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Cases" value="26" icon={FileText} variant="error" />
          <MetricCard title="Pending Cases" value="16" icon={AlertTriangle} variant="warning" />
          <MetricCard title="Closed Cases" value="10" icon={TrendingUp} variant="success" />
          <MetricCard title="Total Value" value="EC$ 1,650,000" icon={Scale} variant="error" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Employers by Litigation Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="employer" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="pending" fill="#F59E0B" name="Pending" radius={[8, 8, 0, 0]} />
                <Bar dataKey="closed" fill="#009B4C" name="Closed" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Litigation Cases by Employer</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Total Cases</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Closed</TableHead>
                  <TableHead>Total Amount (EC$)</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-bold">{index + 1}</TableCell>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="font-semibold">{row.cases}</TableCell>
                    <TableCell className="text-orange-600">{row.pending}</TableCell>
                    <TableCell className="text-green-600">{row.closed}</TableCell>
                    <TableCell className="font-semibold">{row.totalAmount.toLocaleString()}</TableCell>
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
