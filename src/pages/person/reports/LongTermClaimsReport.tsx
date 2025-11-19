import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { longTermClaimsData } from '@/services/mockData/reportsData';
import { StatusBadge } from '@/components/shared/StatusBadge';

export default function LongTermClaimsReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Claim Received Date', type: 'daterange' as const },
    { name: 'claimType', label: 'Claim Type', type: 'select' as const, options: [
      { label: 'Age Benefit', value: 'age' },
      { label: 'Invalidity', value: 'invalidity' },
      { label: 'Survivors', value: 'survivors' }
    ]},
    { name: 'branch', label: 'Branch', type: 'select' as const, options: [
      { label: 'Basseterre', value: 'basseterre' },
      { label: 'Charlestown', value: 'charlestown' }
    ]}
  ];

  return (
    <ReportLayout
      title="Long-Term Claims Processed vs Outstanding Report"
      subtitle="Monitor long-term claim processing performance"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'Long-Term Claims' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Claims" value={longTermClaimsData.summary.totalClaims.toString()} icon={Activity} variant="info" />
          <MetricCard title="Processed" value={longTermClaimsData.summary.processed.toString()} icon={CheckCircle} variant="success" />
          <MetricCard title="Outstanding" value={longTermClaimsData.summary.outstanding.toString()} icon={Clock} variant="warning" />
          <MetricCard title="Avg. Processing Days" value={`${longTermClaimsData.summary.averageProcessingDays} days`} icon={TrendingUp} variant="info" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Claims by Type</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={longTermClaimsData.byType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="processed" fill="hsl(var(--success))" name="Processed" stackId="a" />
                  <Bar dataKey="outstanding" fill="hsl(var(--warning))" name="Outstanding" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Monthly Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={longTermClaimsData.timeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="processed" stroke="hsl(var(--success))" name="Processed" />
                  <Line type="monotone" dataKey="outstanding" stroke="hsl(var(--warning))" name="Outstanding" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      }
      tableArea={
        <Card>
          <CardHeader><CardTitle>Claim Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim ID</TableHead>
                  <TableHead>IP ID</TableHead>
                  <TableHead>Claim Type</TableHead>
                  <TableHead>Date Received</TableHead>
                  <TableHead>Date Processed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Days Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {longTermClaimsData.details.map((row) => (
                  <TableRow key={row.claimId}>
                    <TableCell className="font-medium">{row.claimId}</TableCell>
                    <TableCell>{row.ipId}</TableCell>
                    <TableCell>{row.claimType}</TableCell>
                    <TableCell>{row.dateReceived}</TableCell>
                    <TableCell>{row.dateProcessed || '-'}</TableCell>
                    <TableCell><StatusBadge status={row.status} variant={row.status === 'Processed' ? 'success' : 'warning'} /></TableCell>
                    <TableCell>{row.daysOutstanding || '-'}</TableCell>
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
