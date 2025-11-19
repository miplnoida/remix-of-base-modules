import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { c3EntryVerificationData } from '@/services/mockData/reportsData';
import { StatusBadge } from '@/components/shared/StatusBadge';

export default function C3EntryVerificationReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'officer', label: 'Officer', type: 'select' as const, options: [
      { label: 'Sarah Johnson', value: 'sarah' },
      { label: 'Michael Chen', value: 'michael' }
    ]},
    { name: 'employer', label: 'Employer', type: 'text' as const },
    { name: 'status', label: 'Status', type: 'select' as const, options: [
      { label: 'Verified', value: 'verified' },
      { label: 'Pending', value: 'pending' }
    ]}
  ];

  const handleFilter = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
  };

  return (
    <ReportLayout
      title="C3 Schedules Entry & Verification Report"
      subtitle="Monitor C3 schedule entries and verification progress"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'C3 Entry & Verification' }
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
          <MetricCard title="Total C3 Entered" value={c3EntryVerificationData.summary.totalC3Entered.toString()} icon={FileText} variant="default" />
          <MetricCard title="Total C3 Verified" value={c3EntryVerificationData.summary.totalC3Verified.toString()} icon={CheckCircle} variant="success" />
          <MetricCard title="Pending C3" value={c3EntryVerificationData.summary.pendingC3.toString()} icon={Clock} variant="warning" />
          <MetricCard title="Avg. Verification Time" value={`${c3EntryVerificationData.summary.averageVerificationTime} days`} icon={TrendingUp} variant="default" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>C3 Entry by Officer</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={c3EntryVerificationData.byOfficer}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="officer" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="entered" fill="hsl(var(--primary))" name="Entered" stackId="a" />
                  <Bar dataKey="verified" fill="hsl(var(--success))" name="Verified" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>C3 Volume Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={c3EntryVerificationData.timeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="entered" stroke="hsl(var(--primary))" name="Entered" />
                  <Line type="monotone" dataKey="verified" stroke="hsl(var(--success))" name="Verified" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>C3 Entry & Verification Details</CardTitle>
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
                  <TableHead>Verified Date</TableHead>
                  <TableHead>Verified By</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c3EntryVerificationData.details.map((row) => (
                  <TableRow key={`${row.employerId}-${row.c3Period}`}>
                    <TableCell className="font-medium">{row.employerId}</TableCell>
                    <TableCell>{row.employerName}</TableCell>
                    <TableCell>{row.c3Period}</TableCell>
                    <TableCell>{row.enteredDate}</TableCell>
                    <TableCell>{row.enteredBy}</TableCell>
                    <TableCell>{row.verifiedDate || '-'}</TableCell>
                    <TableCell>{row.verifiedBy || '-'}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} variant={row.status === 'Verified' ? 'success' : 'warning'} />
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
