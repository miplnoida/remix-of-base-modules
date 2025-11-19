import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { UserX, AlertCircle, Building2 } from 'lucide-react';
import { CHART_COLORS, CHART_STYLES } from '@/lib/chartColors';

const mockData = {
  summary: { totalCases: 78, totalNationalities: 12, totalEmployers: 34 },
  byNationality: [
    { nationality: 'Jamaica', count: 23 },
    { nationality: 'Guyana', count: 18 },
    { nationality: 'St. Lucia', count: 15 },
    { nationality: 'Trinidad', count: 12 },
    { nationality: 'Others', count: 10 }
  ],
  byEmployer: [
    { employer: 'ABC Construction', count: 12 },
    { employer: 'XYZ Services', count: 9 },
    { employer: 'Global Corp', count: 8 },
    { employer: 'Island Hotels', count: 7 }
  ],
  details: [
    { personId: 'IP-2024-001', name: 'John Smith', nationality: 'Jamaica', employer: 'ABC Construction', permitStatus: 'Missing', officer: 'Officer A' },
    { personId: 'IP-2024-002', name: 'Maria Garcia', nationality: 'Guyana', employer: 'XYZ Services', permitStatus: 'Expired', officer: 'Officer B' },
    { personId: 'IP-2024-003', name: 'David Brown', nationality: 'St. Lucia', employer: 'Global Corp', permitStatus: 'Missing', officer: 'Officer A' },
    { personId: 'IP-2024-004', name: 'Sarah Wilson', nationality: 'Trinidad', employer: 'Island Hotels', permitStatus: 'Pending', officer: 'Officer C' }
  ]
};

export default function NonNationalWorkersSSNReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'nationality', label: 'Nationality', type: 'text' as const },
    { name: 'employer', label: 'Employer', type: 'text' as const },
    { name: 'officer', label: 'Officer', type: 'text' as const }
  ];

  return (
    <ReportLayout
      title="Non-National Workers Issued SSNs Without Work Permit Report"
      subtitle="Identify foreign nationals issued SSN without valid work permits"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'Non-National Workers SSN' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Total Cases" value={mockData.summary.totalCases.toString()} icon={UserX} variant="warning" />
          <MetricCard title="Nationalities" value={mockData.summary.totalNationalities.toString()} icon={AlertCircle} variant="info" />
          <MetricCard title="Employers Affected" value={mockData.summary.totalEmployers.toString()} icon={Building2} variant="info" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Cases by Nationality</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockData.byNationality}>
                  <CartesianGrid {...CHART_STYLES.grid} />
                  <XAxis dataKey="nationality" {...CHART_STYLES.axis} />
                  <YAxis {...CHART_STYLES.axis} />
                  <Tooltip {...CHART_STYLES.tooltip} />
                  <Bar dataKey="count" fill={CHART_COLORS.gold} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Cases by Employer</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={mockData.byEmployer} cx="50%" cy="50%" labelLine={false} label={(entry) => `${entry.employer}: ${entry.count}`} outerRadius={80} fill={CHART_COLORS.gold} dataKey="count">
                    {mockData.byEmployer.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={[CHART_COLORS.gold, CHART_COLORS.primary, CHART_COLORS.blue, CHART_COLORS.teal][index % 4]} />
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
          <CardHeader><CardTitle>Non-National Worker Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Employer</TableHead>
                  <TableHead>Permit Status</TableHead>
                  <TableHead>Officer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.details.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.personId}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.nationality}</TableCell>
                    <TableCell>{row.employer}</TableCell>
                    <TableCell><span className="text-[#F59E0B] font-semibold">{row.permitStatus}</span></TableCell>
                    <TableCell>{row.officer}</TableCell>
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
