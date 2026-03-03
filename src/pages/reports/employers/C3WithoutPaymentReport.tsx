import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { XCircle, DollarSign, FileText, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { employer: 'ABC Trading', submissions: 8, amount: 52000 },
  { employer: 'XYZ Services', submissions: 6, amount: 38500 },
  { employer: 'Global Co', submissions: 5, amount: 31200 },
  { employer: 'Tech Ltd', submissions: 5, amount: 29800 },
  { employer: 'Retail Inc', submissions: 4, amount: 24600 }
];

const mockData = [
  { id: 'EMP-201', name: 'ABC Trading Ltd', period: 'Jan-Mar 2024', submissions: 8, amountDue: 52000, paymentStatus: 'Pending' },
  { id: 'EMP-202', name: 'XYZ Services Co', period: 'Feb-Apr 2024', submissions: 6, amountDue: 38500, paymentStatus: 'Pending' },
  { id: 'EMP-203', name: 'Global Import Ltd', period: 'Jan-Feb 2024', submissions: 5, amountDue: 31200, paymentStatus: 'Pending' },
  { id: 'EMP-204', name: 'Tech Solutions Inc', period: 'Mar-Apr 2024', submissions: 5, amountDue: 29800, paymentStatus: 'Pending' },
  { id: 'EMP-205', name: 'Retail Plus Group', period: 'Jan-Apr 2024', submissions: 4, amountDue: 24600, paymentStatus: 'Pending' }
];

export default function C3WithoutPaymentReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'employerSize', label: 'Employer Size', type: 'select' as const, options: [
      { label: 'All Sizes', value: 'all' },
      { label: 'Small (1-20)', value: 'small' },
      { label: 'Medium (21-50)', value: 'medium' },
      { label: 'Large (51+)', value: 'large' }
    ]}
  ];

  return (
    <ReportLayout
      title="Top Employers Submitting C3s Without Payment"
      subtitle="C3 forms submitted but payment not received"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'C3 Without Payment' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="No-Payment Submissions" value="28" icon={FileText} variant="warning" />
          <MetricCard title="Employers Affected" value="20" icon={Building2} variant="warning" />
          <MetricCard title="Total Amount Due" value="EC$ 176,100" icon={DollarSign} variant="error" />
          <MetricCard title="Avg Per Employer" value="EC$ 8,805" icon={XCircle} variant="warning" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Top Offenders - C3 Without Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" stroke="#64748B" />
                <YAxis dataKey="employer" type="category" width={120} stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="submissions" fill="#F59E0B" name="Submissions" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>C3 Submissions Without Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>C3 Count</TableHead>
                  <TableHead>Amount Due (EC$)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.period}</TableCell>
                    <TableCell>{row.submissions}</TableCell>
                    <TableCell>{row.amountDue.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs bg-warning/15 text-warning">
                        {row.paymentStatus}
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
