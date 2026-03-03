import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { XCircle, AlertTriangle, DollarSign, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { employer: 'Hotels Group', planAmount: 345000, paidAmount: 115000, missedPayments: 8 },
  { employer: 'Manufacturing', planAmount: 278000, paidAmount: 92667, missedPayments: 6 },
  { employer: 'Construction', planAmount: 221000, paidAmount: 73667, missedPayments: 5 },
  { employer: 'Retail Chain', planAmount: 198000, paidAmount: 66000, missedPayments: 4 },
  { employer: 'Transport Co', planAmount: 156000, paidAmount: 52000, missedPayments: 3 }
];

const mockData = [
  { id: 'EMP-2101', name: 'Hotels Group International', planAmount: 345000, paidAmount: 115000, missedPayments: 8, lastPayment: '2023-12-15', defaultDate: '2024-01-15', escalated: true, zone: 'Zone 1' },
  { id: 'EMP-2102', name: 'Manufacturing Solutions', planAmount: 278000, paidAmount: 92667, missedPayments: 6, lastPayment: '2024-01-01', defaultDate: '2024-02-01', escalated: true, zone: 'Zone 2' },
  { id: 'EMP-2103', name: 'Construction Works Ltd', planAmount: 221000, paidAmount: 73667, missedPayments: 5, lastPayment: '2024-01-10', defaultDate: '2024-02-10', escalated: false, zone: 'Zone 3' },
  { id: 'EMP-2104', name: 'Retail Chain Stores', planAmount: 198000, paidAmount: 66000, missedPayments: 4, lastPayment: '2024-01-20', defaultDate: '2024-02-20', escalated: false, zone: 'Zone 1' },
  { id: 'EMP-2105', name: 'Transport Co Ltd', planAmount: 156000, paidAmount: 52000, missedPayments: 3, lastPayment: '2024-01-25', defaultDate: '2024-02-25', escalated: false, zone: 'Zone 2' }
];

export default function DefaultedPlansReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'defaultType', label: 'Default Type', type: 'select' as const, options: [
      { label: 'All Types', value: 'all' },
      { label: 'Missed Payments', value: 'missed' },
      { label: 'Payment Stopped', value: 'stopped' }
    ]},
    { name: 'officer', label: 'Responsible Officer', type: 'text' as const },
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' }
    ]},
    { name: 'escalated', label: 'Escalation Status', type: 'select' as const, options: [
      { label: 'All', value: 'all' },
      { label: 'Escalated', value: 'escalated' },
      { label: 'Not Escalated', value: 'not_escalated' }
    ]}
  ];

  return (
    <ReportLayout
      title="Employers Who Defaulted on Payment Plans"
      subtitle="Employers with broken or defaulted payment arrangements"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Defaulted Plans' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Defaulted Plans" value="26" icon={XCircle} variant="error" />
          <MetricCard title="Total Outstanding" value="EC$ 1,950,000" icon={DollarSign} variant="error" />
          <MetricCard title="Escalated to Legal" value="12" icon={AlertTriangle} variant="error" />
          <MetricCard title="Avg Missed Payments" value="5.2" icon={Calendar} variant="warning" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Defaulted Payment Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="employer" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Bar dataKey="planAmount" fill="hsl(var(--muted))" name="Plan Amount" radius={[8, 8, 0, 0]} />
                <Bar dataKey="paidAmount" fill="hsl(var(--primary))" name="Paid Amount" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Employers With Defaulted Payment Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Plan Amount (EC$)</TableHead>
                  <TableHead>Paid (EC$)</TableHead>
                  <TableHead>Missed Payments</TableHead>
                  <TableHead>Last Payment</TableHead>
                  <TableHead>Default Date</TableHead>
                  <TableHead>Escalated</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="font-semibold">{row.planAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-success">{row.paidAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-destructive font-semibold">{row.missedPayments}</TableCell>
                    <TableCell>{row.lastPayment}</TableCell>
                    <TableCell>{row.defaultDate}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        row.escalated ? 'bg-destructive/10 text-destructive' : 'bg-warning/15 text-warning'
                      }`}>
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
