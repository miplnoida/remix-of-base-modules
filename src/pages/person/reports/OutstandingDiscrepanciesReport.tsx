import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, AlertTriangle, Clock } from 'lucide-react';
import { outstandingDiscrepanciesData } from '@/services/mockData/reportsData';
import { StatusBadge } from '@/components/shared/StatusBadge';

const COLORS = ['hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--muted))'];

export default function OutstandingDiscrepanciesReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'type', label: 'Discrepancy Type', type: 'select' as const, options: [
      { label: 'SSN Mismatch', value: 'ssn' },
      { label: 'Wage Discrepancy', value: 'wage' },
      { label: 'Missing Documentation', value: 'docs' }
    ]},
    { name: 'source', label: 'Source', type: 'select' as const, options: [
      { label: 'C3', value: 'c3' },
      { label: 'Claim', value: 'claim' },
      { label: 'Registration', value: 'registration' }
    ]},
    { name: 'officer', label: 'Assigned Officer', type: 'text' as const },
    { name: 'priority', label: 'Priority', type: 'select' as const, options: [
      { label: 'Critical', value: 'critical' },
      { label: 'High', value: 'high' },
      { label: 'Medium', value: 'medium' }
    ]}
  ];

  return (
    <ReportLayout
      title="Outstanding Discrepancies & Queries Queue Report"
      subtitle="Monitor all outstanding discrepancies and queries requiring resolution"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'Outstanding Discrepancies' }
      ]}
      filterPanel={
        <QueryByFilter
          fields={filterFields}
          onFilter={setFilters}
          defaultExpanded={false}
        />
      }
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Discrepancies" value={outstandingDiscrepanciesData.summary.totalDiscrepancies.toString()} icon={AlertCircle} variant="warning" />
          <MetricCard title="Critical" value={outstandingDiscrepanciesData.summary.critical.toString()} icon={AlertTriangle} variant="error" />
          <MetricCard title="High" value={outstandingDiscrepanciesData.summary.high.toString()} icon={AlertCircle} variant="warning" />
          <MetricCard title="Medium" value={outstandingDiscrepanciesData.summary.medium.toString()} icon={Clock} variant="default" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Discrepancies by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={outstandingDiscrepanciesData.byType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" angle={-45} textAnchor="end" height={100} />
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
                    data={outstandingDiscrepanciesData.byAging}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.bucket}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="count"
                  >
                    {outstandingDiscrepanciesData.byAging.map((entry, index) => (
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
            <CardTitle>Discrepancy Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Discrepancy ID</TableHead>
                  <TableHead>IP ID</TableHead>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Opened Date</TableHead>
                  <TableHead>Assigned Officer</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Days Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outstandingDiscrepanciesData.details.map((row) => (
                  <TableRow key={row.discrepancyId}>
                    <TableCell className="font-medium">{row.discrepancyId}</TableCell>
                    <TableCell>{row.ipId}</TableCell>
                    <TableCell>{row.employerId || '-'}</TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.openedDate}</TableCell>
                    <TableCell>{row.assignedOfficer}</TableCell>
                    <TableCell>
                      <StatusBadge 
                        status={row.priority} 
                        variant={row.priority === 'Critical' ? 'error' : row.priority === 'High' ? 'warning' : 'info'} 
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} variant={row.status === 'Open' ? 'warning' : 'info'} />
                    </TableCell>
                    <TableCell>
                      <span className={row.daysOutstanding > 30 ? 'text-destructive font-semibold' : ''}>
                        {row.daysOutstanding}
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
