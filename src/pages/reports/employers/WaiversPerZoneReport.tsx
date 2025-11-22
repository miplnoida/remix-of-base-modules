import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, MapPin, DollarSign, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from '@/lib/chartColors';

const chartData = [
  { zone: 'Zone 1', employers: 12, waivers: 38, value: 285000 },
  { zone: 'Zone 2', employers: 15, waivers: 45, value: 348000 },
  { zone: 'Zone 3', employers: 8, waivers: 28, value: 196000 },
  { zone: 'Zone 4', employers: 6, waivers: 21, value: 152000 }
];

const mockData = [
  { id: 'EMP-901', name: 'Central Hotels Group', zone: 'Zone 1', waiverCount: 8, value: 95000, type: 'Interest/Penalties' },
  { id: 'EMP-902', name: 'North Manufacturing', zone: 'Zone 2', waiverCount: 9, value: 112000, type: 'Penalties' },
  { id: 'EMP-903', name: 'South Construction', zone: 'Zone 3', waiverCount: 6, value: 78000, type: 'Interest' },
  { id: 'EMP-904', name: 'East Transport Co', zone: 'Zone 4', waiverCount: 5, value: 65000, type: 'Interest/Penalties' },
  { id: 'EMP-905', name: 'West Retail Chain', zone: 'Zone 2', waiverCount: 7, value: 84000, type: 'Penalties' }
];

export default function WaiversPerZoneReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' },
      { label: 'Zone 4', value: 'zone4' }
    ]},
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const }
  ];

  return (
    <ReportLayout
      title="Top Employers with Waivers Per Zone"
      subtitle="Waiver distribution analyzed by geographical zone"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Waivers Per Zone' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Zones" value="4" icon={MapPin} variant="info" />
          <MetricCard title="Employers" value="41" icon={Building2} variant="info" />
          <MetricCard title="Total Waivers" value="132" icon={CheckCircle} variant="success" />
          <MetricCard title="Total Value" value="EC$ 981,000" icon={DollarSign} variant="success" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Waivers by Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.gridline} />
                <XAxis dataKey="zone" stroke={CHART_COLORS.text} />
                <YAxis stroke={CHART_COLORS.text} />
                <Tooltip />
                <Legend />
                <Bar dataKey="employers" fill={CHART_COLORS.primary} name="Employers" radius={[8, 8, 0, 0]} />
                <Bar dataKey="waivers" fill={CHART_COLORS.blue} name="Waivers" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Employers with Waivers by Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Waiver Count</TableHead>
                  <TableHead>Value (EC$)</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.zone}</TableCell>
                    <TableCell>{row.waiverCount}</TableCell>
                    <TableCell className="font-semibold">{row.value.toLocaleString()}</TableCell>
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
