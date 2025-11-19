import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp, UserCog } from 'lucide-react';
import { CHART_COLORS, CHART_STYLES } from '@/lib/chartColors';

const mockData = {
  summary: { totalRegistrations: 487, dailyPeak: 34, officerCount: 8 },
  byOfficer: [
    { officer: 'Officer A', registrations: 89 },
    { officer: 'Officer B', registrations: 82 },
    { officer: 'Officer C', registrations: 75 },
    { officer: 'Officer D', registrations: 68 },
    { officer: 'Others', registrations: 173 }
  ],
  timeline: [
    { date: 'Week 1', registrations: 95 },
    { date: 'Week 2', registrations: 102 },
    { date: 'Week 3', registrations: 98 },
    { date: 'Week 4', registrations: 105 },
    { date: 'Week 5', registrations: 87 }
  ],
  details: [
    { officer: 'Officer A', personId: 'IP-2024-001', name: 'John Smith', date: '2024-05-15', branch: 'Castries' },
    { officer: 'Officer B', personId: 'IP-2024-002', name: 'Maria Johnson', date: '2024-05-14', branch: 'Vieux Fort' },
    { officer: 'Officer A', personId: 'IP-2024-003', name: 'David Brown', date: '2024-05-13', branch: 'Castries' },
    { officer: 'Officer C', personId: 'IP-2024-004', name: 'Sarah Wilson', date: '2024-05-12', branch: 'Soufriere' }
  ]
};

export default function NewRegistrantsByOfficerReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'officer', label: 'Officer', type: 'text' as const },
    { name: 'branch', label: 'Branch', type: 'select' as const, options: [
      { label: 'Castries', value: 'castries' },
      { label: 'Vieux Fort', value: 'vieuxfort' },
      { label: 'Soufriere', value: 'soufriere' }
    ]}
  ];

  return (
    <ReportLayout
      title="New Registrants by CRD Officer Report"
      subtitle="Track new insured person registrations by CRD officer"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'New Registrants by Officer' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Total Registrations" value={mockData.summary.totalRegistrations.toString()} icon={Users} variant="info" />
          <MetricCard title="Daily Peak" value={mockData.summary.dailyPeak.toString()} icon={TrendingUp} variant="success" />
          <MetricCard title="Active Officers" value={mockData.summary.officerCount.toString()} icon={UserCog} variant="info" />
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
                  <Bar dataKey="registrations" fill={CHART_COLORS.primary} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Registration Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockData.timeline}>
                  <CartesianGrid {...CHART_STYLES.grid} />
                  <XAxis dataKey="date" {...CHART_STYLES.axis} />
                  <YAxis {...CHART_STYLES.axis} />
                  <Tooltip {...CHART_STYLES.tooltip} />
                  <Line type="monotone" dataKey="registrations" stroke={CHART_COLORS.primary} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      }
      tableArea={
        <Card>
          <CardHeader><CardTitle>Registration Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Officer</TableHead>
                  <TableHead>Person ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Branch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.details.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.officer}</TableCell>
                    <TableCell>{row.personId}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.date}</TableCell>
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
