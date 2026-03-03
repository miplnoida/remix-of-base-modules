import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Building2, DollarSign, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { month: 'Jul', employers: 3 },
  { month: 'Aug', employers: 4 },
  { month: 'Sep', employers: 5 },
  { month: 'Oct', employers: 6 },
  { month: 'Nov', employers: 7 },
  { month: 'Dec', employers: 8 },
  { month: 'Jan', employers: 9 },
  { month: 'Feb', employers: 10 },
  { month: 'Mar', employers: 11 }
];

const mockData = [
  { id: 'EMP-041', name: 'Legacy Manufacturing', lastPayment: '2023-11-15', monthsUnpaid: 9, totalDue: 78000, zone: 'Zone 1', status: 'Legal Action' },
  { id: 'EMP-042', name: 'Old School Trading', lastPayment: '2023-10-20', monthsUnpaid: 9, totalDue: 92500, zone: 'Zone 2', status: 'Legal Action' },
  { id: 'EMP-043', name: 'Historic Hotels', lastPayment: '2023-11-30', monthsUnpaid: 9, totalDue: 65800, zone: 'Zone 1', status: 'Escalated' },
  { id: 'EMP-044', name: 'Classic Transport', lastPayment: '2023-10-25', monthsUnpaid: 9, totalDue: 48600, zone: 'Zone 3', status: 'Legal Action' },
  { id: 'EMP-045', name: 'Traditional Retail', lastPayment: '2023-11-10', monthsUnpaid: 9, totalDue: 54200, zone: 'Zone 2', status: 'Escalated' }
];

export default function NonPaying9MonthsReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' }
    ]},
    { name: 'status', label: 'Status', type: 'select' as const, options: [
      { label: 'All', value: 'all' },
      { label: 'Escalated', value: 'escalated' },
      { label: 'Legal Action', value: 'legal' }
    ]},
    { name: 'officer', label: 'Officer', type: 'text' as const }
  ];

  return (
    <ReportLayout
      title="Employers Not Paid for 9 Months"
      subtitle="Employers with no contributions for 9+ consecutive months (Critical)"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Non-Paying 9 Months' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Non-Paying" value="11" icon={AlertTriangle} variant="error" />
          <MetricCard title="Average Months Unpaid" value="9.8" icon={TrendingDown} variant="error" />
          <MetricCard title="Total Outstanding" value="EC$ 824,600" icon={DollarSign} variant="error" />
          <MetricCard title="In Legal Action" value="7" icon={Building2} variant="error" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Non-Paying Employers Trend (Last 9 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Bar dataKey="employers" fill="hsl(var(--destructive))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Critical Non-Paying Employers (9+ Months)</CardTitle>
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
                  <TableHead>Status</TableHead>
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
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        row.status === 'Legal Action' ? 'bg-destructive/10 text-destructive' : 'bg-warning/15 text-warning'
                      }`}>
                        {row.status}
                      </span>
                    </TableCell>
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
