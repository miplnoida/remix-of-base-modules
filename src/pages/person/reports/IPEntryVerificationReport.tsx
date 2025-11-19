import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { ipEntryVerificationData } from '@/services/mockData/reportsData';
import { StatusBadge } from '@/components/shared/StatusBadge';

export default function IPEntryVerificationReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'officer', label: 'Officer', type: 'select' as const, options: [
      { label: 'Sarah Johnson', value: 'sarah' },
      { label: 'Michael Chen', value: 'michael' },
      { label: 'Anish Kumar', value: 'anish' }
    ]},
    { name: 'status', label: 'Status', type: 'select' as const, options: [
      { label: 'Entered', value: 'entered' },
      { label: 'Verified', value: 'verified' },
      { label: 'Pending', value: 'pending' }
    ]},
    { name: 'branch', label: 'Branch', type: 'select' as const, options: [
      { label: 'Basseterre', value: 'basseterre' },
      { label: 'Charlestown', value: 'charlestown' }
    ]}
  ];

  const handleFilter = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
  };

  const handleExportCSV = () => {
    console.log('Exporting CSV...');
  };

  const handleExportPDF = () => {
    console.log('Exporting PDF...');
  };

  return (
    <ReportLayout
      title="Insured Persons Entry & Verification Report"
      subtitle="Track insured person entries and verifications by officer and period"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'IP Entry & Verification' }
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
          <MetricCard title="Total Entered" value={ipEntryVerificationData.summary.totalEntered.toString()} icon={Users} variant="default" />
          <MetricCard title="Total Verified" value={ipEntryVerificationData.summary.totalVerified.toString()} icon={CheckCircle} variant="success" />
          <MetricCard title="Pending Verification" value={ipEntryVerificationData.summary.pendingVerification.toString()} icon={Clock} variant="warning" />
          <MetricCard title="Avg. Verification Time" value={`${ipEntryVerificationData.summary.averageVerificationTime} days`} icon={TrendingUp} variant="default" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Entries by Officer</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ipEntryVerificationData.byOfficer}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="officer" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="entered" fill="hsl(var(--primary))" name="Entered" />
                  <Bar dataKey="verified" fill="hsl(var(--success))" name="Verified" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={ipEntryVerificationData.timeline}>
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
            <CardTitle>Entry & Verification Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Date Entered</TableHead>
                  <TableHead>Entered By</TableHead>
                  <TableHead>Date Verified</TableHead>
                  <TableHead>Verified By</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ipEntryVerificationData.details.map((row) => (
                  <TableRow key={row.ipId}>
                    <TableCell className="font-medium">{row.ipId}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.dateEntered}</TableCell>
                    <TableCell>{row.enteredBy}</TableCell>
                    <TableCell>{row.dateVerified || '-'}</TableCell>
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
      onExportCSV={handleExportCSV}
      onExportPDF={handleExportPDF}
    />
  );
}
