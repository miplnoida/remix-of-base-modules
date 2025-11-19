import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Building2, TrendingUp, UserCog } from 'lucide-react';
import { CHART_COLORS, CHART_STYLES } from '@/lib/chartColors';

const mockData = {
  summary: { totalRegistrations: 234, avgPerOfficer: 29, peakWeek: 45 },
  byOfficer: [
    { officer: 'Officer A', registrations: 52 },
    { officer: 'Officer B', registrations: 48 },
    { officer: 'Officer C', registrations: 44 },
    { officer: 'Officer D', registrations: 38 },
    { officer: 'Others', registrations: 52 }
  ],
  timeline: [
    { week: 'Week 1', registrations: 42 },
    { week: 'Week 2', registrations: 48 },
    { week: 'Week 3', registrations: 45 },
    { week: 'Week 4', registrations: 51 },
    { week: 'Week 5', registrations: 48 }
  ],
  details: [
    { employerId: 'EMP-001', name: 'ABC Construction Ltd', officer: 'Officer A', date: '2024-05-15', type: 'Private Company' },
    { employerId: 'EMP-002', name: 'XYZ Services Inc', officer: 'Officer B', date: '2024-05-14', type: 'Partnership' },
    { employerId: 'EMP-003', name: 'Global Trading Co', officer: 'Officer A', date: '2024-05-13', type: 'Corporation' },
    { employerId: 'EMP-004', name: 'Island Resorts Ltd', officer: 'Officer C', date: '2024-05-12', type: 'Private Company' }
  ]
};

export default function EmployerRegistrationByOfficerReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'officer', label: 'Officer', type: 'text' as const },
    { name: 'employerType', label: 'Employer Type', type: 'select' as const, options: [
      { label: 'Private Company', value: 'private' },
      { label: 'Partnership', value: 'partnership' },
      { label: 'Corporation', value: 'corporation' }
    ]}
  ];

  return (
    <ReportLayout
      title="Employer Registration by CRD Officer Report"
      subtitle="Track employer registrations handled by CRD officers"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'Employer Registration by Officer' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Total Registrations" value={mockData.summary.totalRegistrations.toString()} icon={Building2} variant="info" />
          <MetricCard title="Avg. Per Officer" value={mockData.summary.avgPerOfficer.toString()} icon={UserCog} variant="info" />
          <MetricCard title="Peak Week" value={mockData.summary.peakWeek.toString()} icon={TrendingUp} variant="success" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Registrations by Officer</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockData.byOfficer}>
                  <CartesianGrid {...CHART_STYLES.grid} />
                  <XAxis dataKey="officer" {...CHART_STYLES.axis} />
                  <YAxis {...CHART_STYLES.axis} />
                  <Tooltip {...CHART_STYLES.tooltip} />
                  <Bar dataKey="registrations" fill={CHART_COLORS.blue} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Weekly Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockData.timeline}>
                  <CartesianGrid {...CHART_STYLES.grid} />
                  <XAxis dataKey="week" {...CHART_STYLES.axis} />
                  <YAxis {...CHART_STYLES.axis} />
                  <Tooltip {...CHART_STYLES.tooltip} />
                  <Line type="monotone" dataKey="registrations" stroke={CHART_COLORS.blue} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      }
      tableArea={
        <Card>
          <CardHeader><CardTitle>Employer Registration Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Officer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.details.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.employerId}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.officer}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.type}</TableCell>
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
