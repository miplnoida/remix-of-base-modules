import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, MapPin, TrendingUp, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const chartData = [
  { zone: 'Zone 1', contributions: 1245000, employers: 145 },
  { zone: 'Zone 2', contributions: 1568000, employers: 182 },
  { zone: 'Zone 3', contributions: 896000, employers: 98 },
  { zone: 'Zone 4', contributions: 654000, employers: 76 }
];

const mockData = [
  { id: 'EMP-201', name: 'Central Hotels', zone: 'Zone 1', month: 'March 2024', contributions: 145000 },
  { id: 'EMP-202', name: 'North Manufacturing', zone: 'Zone 2', month: 'March 2024', contributions: 178000 },
  { id: 'EMP-203', name: 'South Construction', zone: 'Zone 3', month: 'March 2024', contributions: 102000 },
  { id: 'EMP-204', name: 'East Transport', zone: 'Zone 4', month: 'March 2024', contributions: 87000 },
  { id: 'EMP-205', name: 'West Retail', zone: 'Zone 2', month: 'March 2024', contributions: 98500 }
];

export default function ContributionsPerZoneReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'month', label: 'Month', type: 'text' as const },
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' },
      { label: 'Zone 4', value: 'zone4' }
    ]}
  ];

  return (
    <ReportLayout
      title="Top Employers Based on Contributions Per Month by Zone"
      subtitle="Monthly contribution performance analyzed by zone"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Contributions Per Zone' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Contributions" value="EC$ 4,363,000" icon={DollarSign} variant="success" />
          <MetricCard title="Highest Zone" value="Zone 2" icon={Award} variant="success" />
          <MetricCard title="Avg Per Zone" value="EC$ 1,090,750" icon={TrendingUp} variant="info" />
          <MetricCard title="Total Zones" value="4" icon={MapPin} variant="info" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Monthly Contributions by Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="zone" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Legend />
                <Bar dataKey="contributions" fill="#009B4C" name="Contributions (EC$)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="employers" fill="#2563EB" name="Employers" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Top Contributors Per Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Contributions (EC$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.zone}</TableCell>
                    <TableCell>{row.month}</TableCell>
                    <TableCell className="font-semibold">{row.contributions.toLocaleString()}</TableCell>
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
