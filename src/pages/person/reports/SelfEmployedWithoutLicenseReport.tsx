import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, Building2, Users } from 'lucide-react';
import { CHART_COLORS, CHART_STYLES } from '@/lib/chartColors';

const mockData = {
  summary: { totalUnlicensed: 145, topIndustries: 6, avgAge: 38 },
  byIndustry: [
    { industry: 'Construction', count: 45 },
    { industry: 'Retail', count: 32 },
    { industry: 'Services', count: 28 },
    { industry: 'Agriculture', count: 22 },
    { industry: 'Others', count: 18 }
  ],
  details: [
    { personId: 'IP-2024-001', businessName: 'Smith Construction', industry: 'Construction', branch: 'Castries' },
    { personId: 'IP-2024-002', businessName: 'Quick Services', industry: 'Services', branch: 'Vieux Fort' }
  ]
};

export default function SelfEmployedWithoutLicenseReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  return (
    <ReportLayout
      title="Self-Employed Without Business License Report"
      subtitle="Identify unlicensed self-employed persons"
      breadcrumbs={[{ label: 'Insured Persons', href: '/person/management' }, { label: 'Reports' }, { label: 'Self-Employed Without License' }]}
      filterPanel={<QueryByFilter fields={[{ name: 'dateRange', label: 'Date Range', type: 'daterange' as const }]} onFilter={setFilters} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Total Unlicensed" value={mockData.summary.totalUnlicensed.toString()} icon={AlertCircle} variant="warning" />
          <MetricCard title="Top Industries" value={mockData.summary.topIndustries.toString()} icon={Building2} variant="info" />
          <MetricCard title="Avg. Age" value={mockData.summary.avgAge.toString()} icon={Users} variant="info" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader><CardTitle>Unlicensed by Industry</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockData.byIndustry}>
                <CartesianGrid {...CHART_STYLES.grid} />
                <XAxis dataKey="industry" {...CHART_STYLES.axis} />
                <YAxis {...CHART_STYLES.axis} />
                <Tooltip {...CHART_STYLES.tooltip} />
                <Bar dataKey="count" fill={CHART_COLORS.gold} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader><CardTitle>Unlicensed Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person ID</TableHead>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Branch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.details.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.personId}</TableCell>
                    <TableCell>{row.businessName}</TableCell>
                    <TableCell>{row.industry}</TableCell>
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
