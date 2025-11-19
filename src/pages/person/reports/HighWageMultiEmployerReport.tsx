import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { UsersRound, DollarSign, TrendingUp, Building2 } from 'lucide-react';
import { highWageMultiEmployerData } from '@/services/mockData/reportsData';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--secondary))'];

export default function HighWageMultiEmployerReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'period', label: 'Period (Month/Year)', type: 'text' as const },
    { name: 'wageThreshold', label: 'Min. Wage Threshold', type: 'text' as const },
    { name: 'numEmployers', label: 'Min. Number of Employers', type: 'text' as const }
  ];

  return (
    <ReportLayout
      title="High-Wage Multi-Employer Insured Persons Report"
      subtitle="Identify persons with multiple employers exceeding wage thresholds"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'High-Wage Multi-Employer' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Persons" value={highWageMultiEmployerData.summary.totalPersons.toString()} icon={UsersRound} variant="info" />
          <MetricCard title="Avg. Wages" value={`EC$${highWageMultiEmployerData.summary.averageWages.toLocaleString()}`} icon={DollarSign} variant="success" />
          <MetricCard title="Max Wages" value={`EC$${highWageMultiEmployerData.summary.maxWages.toLocaleString()}`} icon={TrendingUp} variant="success" />
          <MetricCard title="Avg. Employers" value={highWageMultiEmployerData.summary.averageEmployers.toString()} icon={Building2} variant="info" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Wage Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={highWageMultiEmployerData.wageDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--success))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Distribution by Branch</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={highWageMultiEmployerData.byBranch}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.branch}: ${entry.count}`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="count"
                  >
                    {highWageMultiEmployerData.byBranch.map((entry, index) => (
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
          <CardHeader><CardTitle>High-Wage Multi-Employer Persons</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Number of Employers</TableHead>
                  <TableHead>Total Monthly Wages</TableHead>
                  <TableHead>Employers List</TableHead>
                  <TableHead>Branch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {highWageMultiEmployerData.details.map((row) => (
                  <TableRow key={row.ipId}>
                    <TableCell className="font-medium">{row.ipId}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.numEmployers}</TableCell>
                    <TableCell className="font-semibold text-success">EC${row.totalWages.toLocaleString()}</TableCell>
                    <TableCell className="max-w-xs truncate" title={row.employers}>{row.employers}</TableCell>
                    <TableCell>{row.branch}</TableCell>
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
