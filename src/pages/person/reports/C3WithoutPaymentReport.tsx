import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, Building2, AlertCircle, TrendingUp } from 'lucide-react';
import { c3WithoutPaymentData } from '@/services/mockData/reportsData';

export default function C3WithoutPaymentReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'employer', label: 'Employer', type: 'text' as const },
    { name: 'status', label: 'Status', type: 'select' as const, options: [
      { label: 'Unpaid', value: 'unpaid' }
    ]}
  ];

  return (
    <ReportLayout
      title="C3s Received Without Payment & Employers Report"
      subtitle="Track C3 submissions received without corresponding payments"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'C3s Without Payment' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Without Payment" value={c3WithoutPaymentData.summary.totalWithoutPayment.toString()} icon={AlertCircle} variant="error" />
          <MetricCard title="Employers Affected" value={c3WithoutPaymentData.summary.employersAffected.toString()} icon={Building2} variant="warning" />
          <MetricCard title="Total Amount Due" value={`EC$${c3WithoutPaymentData.summary.totalAmountDue.toLocaleString()}`} icon={DollarSign} variant="error" />
          <MetricCard title="Avg. Days Unpaid" value={`${c3WithoutPaymentData.summary.averageDaysUnpaid} days`} icon={TrendingUp} variant="warning" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Unpaid C3s by Employer</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={c3WithoutPaymentData.byEmployer}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="employer" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Monthly Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={c3WithoutPaymentData.timeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--destructive))" name="Unpaid C3s" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      }
      tableArea={
        <Card>
          <CardHeader><CardTitle>C3s Without Payment Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>C3 Period</TableHead>
                  <TableHead>Received Date</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Amount Due</TableHead>
                  <TableHead>Days Since Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c3WithoutPaymentData.details.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.employerId}</TableCell>
                    <TableCell>{row.employerName}</TableCell>
                    <TableCell>{row.c3Period}</TableCell>
                    <TableCell>{row.receivedDate}</TableCell>
                    <TableCell><span className="text-destructive font-semibold">{row.paymentStatus}</span></TableCell>
                    <TableCell>EC${row.amountDue.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={row.daysSince > 30 ? 'text-destructive font-semibold' : 'text-warning'}>
                        {row.daysSince}
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
