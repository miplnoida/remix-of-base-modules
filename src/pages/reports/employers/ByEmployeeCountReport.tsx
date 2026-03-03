import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Building2, Award, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { employer: 'Hotels Group', employees: 425 },
  { employer: 'Manufacturing', employees: 380 },
  { employer: 'Retail Chain', employees: 342 },
  { employer: 'Construction', employees: 298 },
  { employer: 'Security Ltd', employees: 265 },
  { employer: 'Transport Co', employees: 234 },
  { employer: 'Tech Solutions', employees: 198 },
  { employer: 'Import Co', employees: 175 },
  { employer: 'Trading Ltd', employees: 152 },
  { employer: 'Services Inc', employees: 138 }
];

const mockData = [
  { id: 'EMP-501', name: 'Hotels Group International', industry: 'Hospitality', employees: 425, zone: 'Zone 1', status: 'Active' },
  { id: 'EMP-502', name: 'Manufacturing Solutions Ltd', industry: 'Manufacturing', employees: 380, zone: 'Zone 2', status: 'Active' },
  { id: 'EMP-503', name: 'Retail Chain Stores', industry: 'Retail', employees: 342, zone: 'Zone 1', status: 'Active' },
  { id: 'EMP-504', name: 'Construction Works Co', industry: 'Construction', employees: 298, zone: 'Zone 3', status: 'Active' },
  { id: 'EMP-505', name: 'Security Services Ltd', industry: 'Security', employees: 265, zone: 'Zone 2', status: 'Active' }
];

export default function ByEmployeeCountReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'period', label: 'Period', type: 'text' as const },
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' }
    ]},
    { name: 'industry', label: 'Industry', type: 'text' as const }
  ];

  return (
    <ReportLayout
      title="Top Employers Based on Number of Employees"
      subtitle="Largest employers ranked by employee count"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'By Employee Count' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Largest Employer" value="425" icon={Award} variant="success" />
          <MetricCard title="Total Employees" value="2,907" icon={Users} variant="info" />
          <MetricCard title="Average Size" value="291" icon={Building2} variant="info" />
          <MetricCard title="Top 10 Total" value="2,907" icon={TrendingUp} variant="success" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Employers by Employee Count</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="employer" type="category" width={120} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Bar dataKey="employees" fill="hsl(var(--primary))" name="Employees" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Employer Rankings by Size</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Total Employees</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-bold">{index + 1}</TableCell>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.industry}</TableCell>
                    <TableCell className="font-semibold">{row.employees}</TableCell>
                    <TableCell>{row.zone}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                        {row.status}
                      </span>
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
