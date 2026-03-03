import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, AlertTriangle, Building2, Scale } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { employer: 'Hotels Group', arrears: 645000 },
  { employer: 'Manufacturing', arrears: 578000 },
  { employer: 'Construction', arrears: 456000 },
  { employer: 'Retail Chain', arrears: 398500 },
  { employer: 'Transport Co', arrears: 387200 }
];

const mockData = [
  { id: 'EMP-1101', name: 'Hotels Group International', arrears: 645000, lastPayment: '2023-10-15', daysOverdue: 165, zone: 'Zone 1', escalated: true },
  { id: 'EMP-1102', name: 'Manufacturing Solutions', arrears: 578000, lastPayment: '2023-11-01', daysOverdue: 150, zone: 'Zone 2', escalated: true },
  { id: 'EMP-1103', name: 'Construction Works Ltd', arrears: 456000, lastPayment: '2023-10-20', daysOverdue: 160, zone: 'Zone 3', escalated: true },
  { id: 'EMP-1104', name: 'Retail Chain Stores', arrears: 398500, lastPayment: '2023-11-10', daysOverdue: 140, zone: 'Zone 1', escalated: true },
  { id: 'EMP-1105', name: 'Transport Co Ltd', arrears: 387200, lastPayment: '2023-10-25', daysOverdue: 155, zone: 'Zone 2', escalated: true }
];

export default function ArrearsOver300kReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' }
    ]},
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'escalationStatus', label: 'Escalation Status', type: 'select' as const, options: [
      { label: 'All', value: 'all' },
      { label: 'Escalated', value: 'escalated' },
      { label: 'Not Escalated', value: 'not_escalated' }
    ]}
  ];

  return (
    <ReportLayout
      title="Employers With Arrears Over EC$ 300,000"
      subtitle="Employers exceeding 300k arrears threshold - Legal action required"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Arrears Over 300K' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Employers" value="9" icon={Building2} variant="error" />
          <MetricCard title="Total Arrears" value="EC$ 8,450,000" icon={DollarSign} variant="error" />
          <MetricCard title="Escalated to Legal" value="9" icon={Scale} variant="error" />
          <MetricCard title="Highest Arrears" value="EC$ 645,000" icon={AlertTriangle} variant="error" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Employers Over 300K Arrears</CardTitle>
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
            <CardTitle>Employers With 300K+ Arrears</CardTitle>
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
                  <TableHead>Escalated</TableHead>
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
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs bg-destructive/10 text-destructive">
                        {row.escalated ? 'Yes' : 'No'}
                      </span>
                    </TableCell>
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
