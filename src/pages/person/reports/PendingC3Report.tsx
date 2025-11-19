import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Clock, AlertCircle, Calendar, TrendingUp } from 'lucide-react';
import { pendingC3Data } from '@/services/mockData/reportsData';
import { StatusBadge } from '@/components/shared/StatusBadge';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

export default function PendingC3Report() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Entered Date Range', type: 'daterange' as const },
    { name: 'employer', label: 'Employer', type: 'text' as const },
    { name: 'officer', label: 'Officer', type: 'select' as const, options: [
      { label: 'All Officers', value: 'all' },
      { label: 'Sarah Johnson', value: 'sarah' }
    ]},
    { name: 'agingBucket', label: 'Aging', type: 'select' as const, options: [
      { label: 'All', value: 'all' },
      { label: 'Over 7 days', value: '7' },
      { label: 'Over 30 days', value: '30' }
    ]}
  ];

  const handleFilter = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
  };

  return (
    <ReportLayout
      title="Pending C3 Schedules (Unverified) Report"
      subtitle="Identify C3 schedules pending verification for follow-up"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'Pending C3 Schedules' }
      ]}
      filterPanel={
        <QueryByFilter
          fields={filterFields}
          onFilter={handleFilter}
          defaultExpanded={false}
        />
      }
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Pending" value={pendingC3Data.summary.totalPending.toString()} icon={Clock} variant="warning" />
          <MetricCard title="Over 7 Days" value={pendingC3Data.summary.over7Days.toString()} icon={AlertCircle} variant="warning" />
          <MetricCard title="Over 30 Days" value={pendingC3Data.summary.over30Days.toString()} icon={AlertCircle} variant="error" />
          <MetricCard title="Avg. Pending Days" value={`${pendingC3Data.summary.averagePendingDays} days`} icon={TrendingUp} variant="default" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pending C3s by Employer</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pendingC3Data.byEmployer}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="employer" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--warning))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Aging Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pendingC3Data.byAging}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.bucket}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="count"
                  >
                    {pendingC3Data.byAging.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Pending C3 Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>C3 Period</TableHead>
                  <TableHead>Entered Date</TableHead>
                  <TableHead>Entered By</TableHead>
                  <TableHead>Days Pending</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingC3Data.details.map((row) => (
                  <TableRow key={`${row.employerId}-${row.c3Period}`}>
                    <TableCell className="font-medium">{row.employerId}</TableCell>
                    <TableCell>{row.employerName}</TableCell>
                    <TableCell>{row.c3Period}</TableCell>
                    <TableCell>{row.enteredDate}</TableCell>
                    <TableCell>{row.enteredBy}</TableCell>
                    <TableCell>
                      <span className={row.daysPending > 30 ? 'text-destructive font-semibold' : row.daysPending > 7 ? 'text-warning' : ''}>
                        {row.daysPending}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} variant="warning" />
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
