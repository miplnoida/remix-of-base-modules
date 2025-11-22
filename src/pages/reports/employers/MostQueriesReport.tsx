import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare, AlertCircle, TrendingUp, FileQuestion } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from '@/lib/chartColors';

const chartData = [
  { employer: 'Hotels Group', queries: 28, overpayment: 12, underpayment: 10, ssnMismatch: 6 },
  { employer: 'Manufacturing', queries: 24, overpayment: 10, underpayment: 9, ssnMismatch: 5 },
  { employer: 'Construction', queries: 19, overpayment: 8, underpayment: 7, ssnMismatch: 4 },
  { employer: 'Retail Chain', queries: 16, overpayment: 7, underpayment: 6, ssnMismatch: 3 },
  { employer: 'Transport Co', queries: 14, overpayment: 6, underpayment: 5, ssnMismatch: 3 }
];

const mockData = [
  { id: 'EMP-501', name: 'Hotels Group International', totalQueries: 28, overpayment: 12, underpayment: 10, ssnMismatch: 6, zone: 'Zone 1' },
  { id: 'EMP-502', name: 'Manufacturing Solutions', totalQueries: 24, overpayment: 10, underpayment: 9, ssnMismatch: 5, zone: 'Zone 2' },
  { id: 'EMP-503', name: 'Construction Works Ltd', totalQueries: 19, overpayment: 8, underpayment: 7, ssnMismatch: 4, zone: 'Zone 3' },
  { id: 'EMP-504', name: 'Retail Chain Stores', totalQueries: 16, overpayment: 7, underpayment: 6, ssnMismatch: 3, zone: 'Zone 1' },
  { id: 'EMP-505', name: 'Transport Co Ltd', totalQueries: 14, overpayment: 6, underpayment: 5, ssnMismatch: 3, zone: 'Zone 2' }
];

export default function MostQueriesReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'queryType', label: 'Query Type', type: 'select' as const, options: [
      { label: 'All Types', value: 'all' },
      { label: 'Overpayment', value: 'overpayment' },
      { label: 'Underpayment', value: 'underpayment' },
      { label: 'SSN Mismatch', value: 'ssn_mismatch' }
    ]},
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' }
    ]}
  ];

  return (
    <ReportLayout
      title="Top Employers Submitting C3s With Most Queries"
      subtitle="Employers with highest number of C3 submission queries"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'With Most Queries' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Queries" value="101" icon={MessageSquare} variant="warning" />
          <MetricCard title="Overpayment Issues" value="43" icon={AlertCircle} variant="info" />
          <MetricCard title="Underpayment Issues" value="37" icon={TrendingUp} variant="error" />
          <MetricCard title="SSN Mismatches" value="21" icon={FileQuestion} variant="warning" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Employers by Query Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.gridline} />
                <XAxis dataKey="employer" stroke={CHART_COLORS.text} />
                <YAxis stroke={CHART_COLORS.text} />
                <Tooltip />
                <Legend />
                <Bar dataKey="overpayment" fill={CHART_COLORS.blue} name="Overpayment" radius={[8, 8, 0, 0]} />
                <Bar dataKey="underpayment" fill={CHART_COLORS.gold} name="Underpayment" radius={[8, 8, 0, 0]} />
                <Bar dataKey="ssnMismatch" fill={CHART_COLORS.error} name="SSN Mismatch" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>C3 Queries by Employer</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Total Queries</TableHead>
                  <TableHead>Overpayment</TableHead>
                  <TableHead>Underpayment</TableHead>
                  <TableHead>SSN Mismatch</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-bold">{index + 1}</TableCell>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="font-semibold">{row.totalQueries}</TableCell>
                    <TableCell>{row.overpayment}</TableCell>
                    <TableCell>{row.underpayment}</TableCell>
                    <TableCell>{row.ssnMismatch}</TableCell>
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
