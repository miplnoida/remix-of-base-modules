import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, AlertTriangle, Building2, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { employer: 'Hotels Group', arrears: 245000 },
  { employer: 'Manufacturing', arrears: 178000 },
  { employer: 'Construction', arrears: 156000 },
  { employer: 'Retail Chain', arrears: 98500 },
  { employer: 'Transport Co', arrears: 87200 }
];

const mockData = [
  { id: 'EMP-801', name: 'Hotels Group International', arrears: 245000, lastPayment: '2024-01-15', daysOverdue: 75, zone: 'Zone 1' },
  { id: 'EMP-802', name: 'Manufacturing Solutions', arrears: 178000, lastPayment: '2024-02-01', daysOverdue: 60, zone: 'Zone 2' },
  { id: 'EMP-803', name: 'Construction Works Ltd', arrears: 156000, lastPayment: '2024-01-20', daysOverdue: 70, zone: 'Zone 3' },
  { id: 'EMP-804', name: 'Retail Chain Stores', arrears: 98500, lastPayment: '2024-02-10', daysOverdue: 50, zone: 'Zone 1' },
  { id: 'EMP-805', name: 'Transport Co Ltd', arrears: 87200, lastPayment: '2024-01-25', daysOverdue: 65, zone: 'Zone 2' }
];

export default function ArrearsOver50kReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' }
    ]},
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'industry', label: 'Industry', type: 'text' as const }
  ];

  return (
    <ReportLayout
      title="Employers With Arrears Over EC$ 50,000"
      subtitle="Employers exceeding 50k arrears threshold"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Arrears Over 50K' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Employers" value="42" icon={Building2} variant="error" />
          <MetricCard title="Total Arrears" value="EC$ 2,850,000" icon={DollarSign} variant="error" />
          <MetricCard title="Average Arrears" value="EC$ 67,857" icon={TrendingUp} variant="warning" />
          <MetricCard title="Highest Arrears" value="EC$ 245,000" icon={AlertTriangle} variant="error" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Employers Over 50K Arrears</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="employer" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Bar dataKey="arrears" fill="hsl(var(--destructive))" name="Arrears (EC$)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Employers With 50K+ Arrears</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Arrears (EC$)</TableHead>
                  <TableHead>Last Payment</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-bold">{index + 1}</TableCell>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="font-semibold text-destructive">{row.arrears.toLocaleString()}</TableCell>
                    <TableCell>{row.lastPayment}</TableCell>
                    <TableCell>{row.daysOverdue}</TableCell>
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
