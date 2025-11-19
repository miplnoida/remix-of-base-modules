import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LineChart, Edit, TrendingUp, AlertCircle } from 'lucide-react';
import { c3LineItemChangesData } from '@/services/mockData/reportsData';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

export default function C3LineItemChangesReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'officer', label: 'Officer', type: 'text' as const },
    { name: 'employer', label: 'Employer', type: 'text' as const },
    { name: 'changeType', label: 'Change Type', type: 'select' as const, options: [
      { label: 'Wage Adjusted', value: 'wage' },
      { label: 'SSN Corrected', value: 'ssn' },
      { label: 'Name Corrected', value: 'name' },
      { label: 'Weeks Adjusted', value: 'weeks' }
    ]}
  ];

  return (
    <ReportLayout
      title="C3 Line-Item Verification Change Tracking Report"
      subtitle="Monitor changes made during C3 line-item verification to gauge error rates"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'C3 Line-Item Changes' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Changes" value={c3LineItemChangesData.summary.totalChanges.toString()} icon={LineChart} variant="warning" />
          <MetricCard title="Wage Adjustments" value={c3LineItemChangesData.summary.wageAdjustments.toString()} icon={Edit} variant="info" />
          <MetricCard title="SSN Corrections" value={c3LineItemChangesData.summary.ssnCorrections.toString()} icon={AlertCircle} variant="warning" />
          <MetricCard title="Other Changes" value={c3LineItemChangesData.summary.otherChanges.toString()} icon={TrendingUp} variant="info" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Changes by Officer</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={c3LineItemChangesData.byOfficer}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="officer" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="changes" fill="hsl(var(--warning))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Change Type Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={c3LineItemChangesData.byChangeType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.type}: ${entry.count}`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="count"
                  >
                    {c3LineItemChangesData.byChangeType.map((entry, index) => (
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
          <CardHeader><CardTitle>Line-Item Change Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Change ID</TableHead>
                  <TableHead>C3 ID</TableHead>
                  <TableHead>Employer</TableHead>
                  <TableHead>IP ID</TableHead>
                  <TableHead>Field Changed</TableHead>
                  <TableHead>Old Value</TableHead>
                  <TableHead>New Value</TableHead>
                  <TableHead>Changed By</TableHead>
                  <TableHead>Change Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c3LineItemChangesData.details.map((row) => (
                  <TableRow key={row.changeId}>
                    <TableCell className="font-medium">{row.changeId}</TableCell>
                    <TableCell>{row.c3Id}</TableCell>
                    <TableCell>{row.employer}</TableCell>
                    <TableCell>{row.ipId}</TableCell>
                    <TableCell>
                      <span className={
                        row.fieldChanged === 'SSN' ? 'text-warning font-semibold' :
                        row.fieldChanged === 'Wage' ? 'text-primary font-semibold' : ''
                      }>
                        {row.fieldChanged}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.oldValue}</TableCell>
                    <TableCell className="font-semibold text-success">{row.newValue}</TableCell>
                    <TableCell>{row.changedBy}</TableCell>
                    <TableCell>{row.changeDate}</TableCell>
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
