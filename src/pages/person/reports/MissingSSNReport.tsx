import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileWarning, Building2, DollarSign, TrendingUp } from 'lucide-react';
import { missingSsnData } from '@/services/mockData/reportsData';

export default function MissingSSNReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'employer', label: 'Employer', type: 'text' as const },
    { name: 'officer', label: 'Officer', type: 'text' as const }
  ];

  return (
    <ReportLayout
      title="C3s With Missing Social Security Numbers Report"
      subtitle="Track C3 entries with missing SSNs for follow-up registration"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'C3s Missing SSN' }
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
          <MetricCard title="Total Missing SSNs" value={missingSsnData.summary.totalMissing.toString()} icon={FileWarning} variant="warning" />
          <MetricCard title="Employers Affected" value={missingSsnData.summary.employersAffected.toString()} icon={Building2} variant="default" />
          <MetricCard title="Total Wages" value={`EC$${missingSsnData.summary.totalWages.toLocaleString()}`} icon={DollarSign} variant="default" />
          <MetricCard title="Avg. Per Entry" value={`EC$${missingSsnData.summary.averagePerEntry.toLocaleString()}`} icon={TrendingUp} variant="default" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Missing SSNs by Employer</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={missingSsnData.byEmployer}>
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
              <CardTitle>Trend Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={missingSsnData.timeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--warning))" name="Missing SSNs" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>C3 Entries with Missing SSN</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>C3 Period</TableHead>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Wages</TableHead>
                  <TableHead>Entered Date</TableHead>
                  <TableHead>Entered By</TableHead>
                  <TableHead>SSN Missing?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {missingSsnData.details.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.employerId}</TableCell>
                    <TableCell>{row.employerName}</TableCell>
                    <TableCell>{row.c3Period}</TableCell>
                    <TableCell>{row.employeeName}</TableCell>
                    <TableCell>EC${row.wages.toLocaleString()}</TableCell>
                    <TableCell>{row.enteredDate}</TableCell>
                    <TableCell>{row.enteredBy}</TableCell>
                    <TableCell>
                      <span className="text-destructive font-semibold">{row.ssnMissing}</span>
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
