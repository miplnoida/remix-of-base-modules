import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, DollarSign, FileText, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { employer: 'Hotels Group', waivers: 8, value: 95000 },
  { employer: 'Construction', waivers: 6, value: 78000 },
  { employer: 'Manufacturing', waivers: 5, value: 65000 },
  { employer: 'Transport Co', waivers: 4, value: 52000 },
  { employer: 'Retail Chain', waivers: 4, value: 48000 }
];

const mockData = [
  { id: 'EMP-801', name: 'Hotels Group International', waiverCount: 8, totalValue: 95000, type: 'Interest/Penalties', zone: 'Zone 1' },
  { id: 'EMP-802', name: 'Construction Works Ltd', waiverCount: 6, totalValue: 78000, type: 'Penalties', zone: 'Zone 3' },
  { id: 'EMP-803', name: 'Manufacturing Solutions', waiverCount: 5, totalValue: 65000, type: 'Interest', zone: 'Zone 2' },
  { id: 'EMP-804', name: 'Transport Co Ltd', waiverCount: 4, totalValue: 52000, type: 'Interest/Penalties', zone: 'Zone 1' },
  { id: 'EMP-805', name: 'Retail Chain Stores', waiverCount: 4, totalValue: 48000, type: 'Penalties', zone: 'Zone 2' }
];

export default function ByWaiversReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'waiverType', label: 'Waiver Type', type: 'select' as const, options: [
      { label: 'All Types', value: 'all' },
      { label: 'Interest', value: 'interest' },
      { label: 'Penalties', value: 'penalties' },
      { label: 'Interest/Penalties', value: 'both' }
    ]}
  ];

  return (
    <ReportLayout
      title="Top Employers Based on Waivers Granted"
      subtitle="Employers with highest number and value of waivers approved"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'By Waivers' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Waivers" value="27" icon={FileText} variant="info" />
          <MetricCard title="Total Value" value="EC$ 338,000" icon={DollarSign} variant="success" />
          <MetricCard title="Average Value" value="EC$ 67,600" icon={Award} variant="info" />
          <MetricCard title="Highest Count" value="8" icon={CheckCircle} variant="success" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Employers by Waiver Count & Value</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="employer" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="waivers" fill="#009B4C" name="Waiver Count" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Waivers Granted by Employer</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Waiver Count</TableHead>
                  <TableHead>Total Value (EC$)</TableHead>
                  <TableHead>Waiver Type</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-bold">{index + 1}</TableCell>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.waiverCount}</TableCell>
                    <TableCell className="font-semibold">{row.totalValue.toLocaleString()}</TableCell>
                    <TableCell>{row.type}</TableCell>
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
