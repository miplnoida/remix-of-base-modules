import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Building2, DollarSign, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { zone: 'Zone 1', employers: 12, totalArrears: 385000 },
  { zone: 'Zone 2', employers: 15, totalArrears: 478000 },
  { zone: 'Zone 3', employers: 8, totalArrears: 256000 },
  { zone: 'Zone 4', employers: 6, totalArrears: 198000 }
];

const mockData = [
  { id: 'EMP-1501', name: 'Retail Plus Inc', arrears: 45000, dueDate: '2024-02-25', daysOverdue: 25, zone: 'Zone 1' },
  { id: 'EMP-1502', name: 'Services Ltd', arrears: 38000, dueDate: '2024-02-28', daysOverdue: 22, zone: 'Zone 2' },
  { id: 'EMP-1503', name: 'Construction Co', arrears: 52000, dueDate: '2024-02-20', daysOverdue: 30, zone: 'Zone 3' },
  { id: 'EMP-1504', name: 'Transport Services', arrears: 41000, dueDate: '2024-02-27', daysOverdue: 23, zone: 'Zone 1' },
  { id: 'EMP-1505', name: 'Manufacturing Ltd', arrears: 48000, dueDate: '2024-02-23', daysOverdue: 27, zone: 'Zone 2' }
];

export default function Arrears30DaysReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' },
      { label: 'Zone 4', value: 'zone4' }
    ]},
    { name: 'industry', label: 'Industry', type: 'text' as const },
    { name: 'minAmount', label: 'Minimum Arrears', type: 'text' as const }
  ];

  return (
    <ReportLayout
      title="Employers in Arrears for 30 Days"
      subtitle="Employers with payments overdue by 30 days"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Arrears 30 Days' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Employers" value="41" icon={Building2} variant="warning" />
          <MetricCard title="Total Arrears" value="EC$ 1,317,000" icon={DollarSign} variant="warning" />
          <MetricCard title="Avg Days Overdue" value="27" icon={Calendar} variant="warning" />
          <MetricCard title="Requiring Action" value="41" icon={AlertCircle} variant="warning" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>30-Day Arrears by Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="zone" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="employers" fill="#F59E0B" name="Employers" radius={[8, 8, 0, 0]} />
                <Bar dataKey="totalArrears" fill="#EF4444" name="Arrears (EC$)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Employers 30 Days in Arrears</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Arrears (EC$)</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="font-semibold text-orange-600">{row.arrears.toLocaleString()}</TableCell>
                    <TableCell>{row.dueDate}</TableCell>
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
