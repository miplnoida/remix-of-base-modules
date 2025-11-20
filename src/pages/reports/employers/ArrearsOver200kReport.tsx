import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, AlertTriangle, Building2, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { employer: 'Hotels Group', arrears: 545000 },
  { employer: 'Manufacturing', arrears: 478000 },
  { employer: 'Construction', arrears: 356000 },
  { employer: 'Retail Chain', arrears: 298500 },
  { employer: 'Transport Co', arrears: 287200 }
];

const mockData = [
  { id: 'EMP-1001', name: 'Hotels Group International', arrears: 545000, lastPayment: '2023-11-15', daysOverdue: 135, zone: 'Zone 1' },
  { id: 'EMP-1002', name: 'Manufacturing Solutions', arrears: 478000, lastPayment: '2023-12-01', daysOverdue: 120, zone: 'Zone 2' },
  { id: 'EMP-1003', name: 'Construction Works Ltd', arrears: 356000, lastPayment: '2023-11-20', daysOverdue: 130, zone: 'Zone 3' },
  { id: 'EMP-1004', name: 'Retail Chain Stores', arrears: 298500, lastPayment: '2023-12-10', daysOverdue: 110, zone: 'Zone 1' },
  { id: 'EMP-1005', name: 'Transport Co Ltd', arrears: 287200, lastPayment: '2023-11-25', daysOverdue: 125, zone: 'Zone 2' }
];

export default function ArrearsOver200kReport() {
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
      title="Employers With Arrears Over EC$ 200,000"
      subtitle="Employers exceeding 200k arrears threshold - Critical escalation"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Arrears Over 200K' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Employers" value="15" icon={Building2} variant="error" />
          <MetricCard title="Total Arrears" value="EC$ 6,850,000" icon={DollarSign} variant="error" />
          <MetricCard title="Average Arrears" value="EC$ 456,667" icon={TrendingUp} variant="error" />
          <MetricCard title="Highest Arrears" value="EC$ 545,000" icon={AlertTriangle} variant="error" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Employers Over 200K Arrears</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="employer" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="arrears" fill="#DC2626" name="Arrears (EC$)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Employers With 200K+ Arrears</CardTitle>
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
                    <TableCell className="font-semibold text-red-700">{row.arrears.toLocaleString()}</TableCell>
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
