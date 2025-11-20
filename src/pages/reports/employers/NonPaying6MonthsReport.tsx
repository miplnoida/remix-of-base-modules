import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Building2, DollarSign, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { month: 'Oct', employers: 8 },
  { month: 'Nov', employers: 10 },
  { month: 'Dec', employers: 12 },
  { month: 'Jan', employers: 14 },
  { month: 'Feb', employers: 15 },
  { month: 'Mar', employers: 16 }
];

const mockData = [
  { id: 'EMP-021', name: 'Construction Co', lastPayment: '2024-02-10', monthsUnpaid: 6, totalDue: 42000, zone: 'Zone 1' },
  { id: 'EMP-022', name: 'Manufacturing Ltd', lastPayment: '2024-01-25', monthsUnpaid: 6, totalDue: 58400, zone: 'Zone 2' },
  { id: 'EMP-023', name: 'Transport Services', lastPayment: '2024-02-15', monthsUnpaid: 6, totalDue: 31200, zone: 'Zone 3' },
  { id: 'EMP-024', name: 'Wholesale Traders', lastPayment: '2024-01-30', monthsUnpaid: 6, totalDue: 26800, zone: 'Zone 1' },
  { id: 'EMP-025', name: 'Security Services', lastPayment: '2024-02-05', monthsUnpaid: 6, totalDue: 19500, zone: 'Zone 2' }
];

export default function NonPaying6MonthsReport() {
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
      title="Employers Not Paid for 6 Months"
      subtitle="Employers with no contributions for 6 consecutive months"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Non-Paying 6 Months' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Non-Paying" value="16" icon={AlertTriangle} variant="error" />
          <MetricCard title="Average Months Unpaid" value="6.4" icon={TrendingDown} variant="error" />
          <MetricCard title="Total Outstanding" value="EC$ 567,200" icon={DollarSign} variant="error" />
          <MetricCard title="Affected Employees" value="468" icon={Building2} variant="error" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Non-Paying Employers Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="employers" fill="#E74C3C" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Non-Paying Employers (6 Months)</CardTitle>
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
