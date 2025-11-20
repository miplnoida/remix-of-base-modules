import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileX, AlertTriangle, Calendar, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { employer: 'ABC Trading', missing: 6 },
  { employer: 'XYZ Services', missing: 5 },
  { employer: 'Global Import', missing: 4 },
  { employer: 'Tech Solutions', missing: 4 },
  { employer: 'Retail Plus', missing: 3 },
  { employer: 'Construction', missing: 3 },
  { employer: 'Transport Co', missing: 3 },
  { employer: 'Security Ltd', missing: 2 },
  { employer: 'Hotels Group', missing: 2 },
  { employer: 'Manufacturing', missing: 2 }
];

const mockData = [
  { id: 'EMP-001', name: 'ABC Trading Ltd', industry: 'Retail', lastSubmission: '2024-01-15', missingMonths: 6, employees: 45 },
  { id: 'EMP-002', name: 'XYZ Services', industry: 'Services', lastSubmission: '2024-02-10', missingMonths: 5, employees: 32 },
  { id: 'EMP-003', name: 'Global Import Co', industry: 'Import/Export', lastSubmission: '2024-02-20', missingMonths: 4, employees: 28 },
  { id: 'EMP-004', name: 'Tech Solutions Ltd', industry: 'Technology', lastSubmission: '2024-02-28', missingMonths: 4, employees: 52 },
  { id: 'EMP-005', name: 'Retail Plus Inc', industry: 'Retail', lastSubmission: '2024-03-05', missingMonths: 3, employees: 38 },
  { id: 'EMP-006', name: 'Construction Works', industry: 'Construction', lastSubmission: '2024-03-10', missingMonths: 3, employees: 64 },
  { id: 'EMP-007', name: 'Transport Co Ltd', industry: 'Transport', lastSubmission: '2024-03-12', missingMonths: 3, employees: 41 },
  { id: 'EMP-008', name: 'Security Services', industry: 'Security', lastSubmission: '2024-04-01', missingMonths: 2, employees: 29 },
  { id: 'EMP-009', name: 'Hotels Group', industry: 'Hospitality', lastSubmission: '2024-04-05', missingMonths: 2, employees: 75 },
  { id: 'EMP-010', name: 'Manufacturing Ltd', industry: 'Manufacturing', lastSubmission: '2024-04-10', missingMonths: 2, employees: 58 }
];

export default function TopMissingC3Report() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'employerSize', label: 'Employer Size', type: 'select' as const, options: [
      { label: 'All Sizes', value: 'all' },
      { label: 'Small (1-20)', value: 'small' },
      { label: 'Medium (21-50)', value: 'medium' },
      { label: 'Large (51+)', value: 'large' }
    ]},
    { name: 'industry', label: 'Industry', type: 'text' as const }
  ];

  return (
    <ReportLayout
      title="Top 20 Employers Who Have Not Submitted C3s"
      subtitle="Employers with highest number of missing C3 submissions"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Top Missing C3' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Missing Submissions" value="39" icon={FileX} variant="error" />
          <MetricCard title="Employers Affected" value="20" icon={Building2} variant="warning" />
          <MetricCard title="Avg Missing Months" value="3.2" icon={Calendar} variant="warning" />
          <MetricCard title="Escalation Level" value="High" icon={AlertTriangle} variant="error" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Employers by Missing C3s</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" stroke="#64748B" />
                <YAxis dataKey="employer" type="category" width={120} stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="missing" fill="#E74C3C" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Top 20 Employers - Missing C3 Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Last Submission</TableHead>
                  <TableHead>Missing Months</TableHead>
                  <TableHead>Employees</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.slice(0, 10).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.industry}</TableCell>
                    <TableCell>{row.lastSubmission}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        row.missingMonths >= 4 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {row.missingMonths}
                      </span>
                    </TableCell>
                    <TableCell>{row.employees}</TableCell>
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
