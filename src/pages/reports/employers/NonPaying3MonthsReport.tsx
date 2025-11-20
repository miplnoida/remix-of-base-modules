import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Building2, DollarSign, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { month: 'Jan', employers: 18 },
  { month: 'Feb', employers: 22 },
  { month: 'Mar', employers: 25 }
];

const mockData = [
  { id: 'EMP-001', name: 'ABC Trading Ltd', lastPayment: '2024-05-15', monthsUnpaid: 3, totalDue: 15420, zone: 'Zone 1' },
  { id: 'EMP-002', name: 'XYZ Services', lastPayment: '2024-04-20', monthsUnpaid: 3, totalDue: 8950, zone: 'Zone 2' },
  { id: 'EMP-003', name: 'Global Imports', lastPayment: '2024-05-10', monthsUnpaid: 3, totalDue: 22500, zone: 'Zone 1' },
  { id: 'EMP-004', name: 'Tech Solutions', lastPayment: '2024-04-30', monthsUnpaid: 3, totalDue: 12800, zone: 'Zone 3' },
  { id: 'EMP-005', name: 'Retail Plus', lastPayment: '2024-05-05', monthsUnpaid: 3, totalDue: 9640, zone: 'Zone 2' }
];

export default function NonPaying3MonthsReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' }
    ]},
    { name: 'officer', label: 'Officer', type: 'text' as const }
  ];

  return (
    <ReportLayout
      title="Employers Not Paid for 3 Months"
      subtitle="Employers with no contributions for 3 consecutive months"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Non-Paying 3 Months' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Non-Paying" value="25" icon={AlertTriangle} variant="error" />
          <MetricCard title="Average Months Unpaid" value="3.2" icon={TrendingDown} variant="warning" />
          <MetricCard title="Total Outstanding" value="EC$ 342,500" icon={DollarSign} variant="error" />
          <MetricCard title="Affected Employees" value="284" icon={Building2} variant="warning" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Non-Paying Employers Trend (Last 3 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="employers" fill="#F59E0B" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Non-Paying Employers (3 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Last Payment</TableHead>
                  <TableHead>Months Unpaid</TableHead>
                  <TableHead>Total Due (EC$)</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.lastPayment}</TableCell>
                    <TableCell>{row.monthsUnpaid}</TableCell>
                    <TableCell>{row.totalDue.toLocaleString()}</TableCell>
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
