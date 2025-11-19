import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp, Building2 } from 'lucide-react';
import { CHART_COLORS, CHART_STYLES } from '@/lib/chartColors';

const mockData = {
  summary: { totalRegistrations: 342, topIndustries: 8, avgPerOfficer: 43 },
  byOfficer: [
    { officer: 'Officer A', registrations: 72 },
    { officer: 'Officer B', registrations: 68 },
    { officer: 'Officer C', registrations: 59 },
    { officer: 'Officer D', registrations: 54 },
    { officer: 'Others', registrations: 89 }
  ],
  byIndustry: [
    { industry: 'Construction', value: 89 },
    { industry: 'Retail', value: 67 },
    { industry: 'Services', value: 58 },
    { industry: 'Agriculture', value: 45 },
    { industry: 'Others', value: 83 }
  ],
  details: [
    { personId: 'IP-2024-001', businessName: 'Smith Construction', industry: 'Construction', officer: 'Officer A', branch: 'Castries' },
    { personId: 'IP-2024-002', businessName: 'Maria\'s Bakery', industry: 'Retail', officer: 'Officer B', branch: 'Vieux Fort' },
    { personId: 'IP-2024-003', businessName: 'Brown Carpentry', industry: 'Construction', officer: 'Officer A', branch: 'Castries' },
    { personId: 'IP-2024-004', businessName: 'Wilson Farming', industry: 'Agriculture', officer: 'Officer C', branch: 'Soufriere' }
  ]
};

export default function SelfEmployedByOfficerReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'officer', label: 'Officer', type: 'text' as const },
    { name: 'industry', label: 'Industry', type: 'text' as const },
    { name: 'branch', label: 'Branch', type: 'select' as const, options: [
      { label: 'Castries', value: 'castries' },
      { label: 'Vieux Fort', value: 'vieuxfort' },
      { label: 'Soufriere', value: 'soufriere' }
    ]}
  ];

  return (
    <ReportLayout
      title="Self-Employed Registration by CRD Officer Report"
      subtitle="Track self-employed person registrations by officer and industry"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'Self-Employed by Officer' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Total Registrations" value={mockData.summary.totalRegistrations.toString()} icon={Users} variant="info" />
          <MetricCard title="Top Industries" value={mockData.summary.topIndustries.toString()} icon={Building2} variant="info" />
          <MetricCard title="Avg. Per Officer" value={mockData.summary.avgPerOfficer.toString()} icon={TrendingUp} variant="success" />
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
                  <Bar dataKey="registrations" fill={CHART_COLORS.teal} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Registrations by Industry</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={mockData.byIndustry} cx="50%" cy="50%" labelLine={false} label={(entry) => `${entry.industry}: ${entry.value}`} outerRadius={80} fill={CHART_COLORS.teal} dataKey="value">
                    {mockData.byIndustry.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={[CHART_COLORS.teal, CHART_COLORS.primary, CHART_COLORS.blue, CHART_COLORS.gold, CHART_COLORS.gray][index % 5]} />
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
          <CardHeader><CardTitle>Self-Employed Registration Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person ID</TableHead>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Officer</TableHead>
                  <TableHead>Branch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.details.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.personId}</TableCell>
                    <TableCell>{row.businessName}</TableCell>
                    <TableCell>{row.industry}</TableCell>
                    <TableCell>{row.officer}</TableCell>
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
