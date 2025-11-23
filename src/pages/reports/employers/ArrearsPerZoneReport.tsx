import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, MapPin, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ExportActions } from '@/components/reports/ExportActions';
import { ExportColumn } from '@/utils/exportUtils';

const chartData = [
  { zone: 'Zone 1', employers: 45, arrears: 1245000 },
  { zone: 'Zone 2', employers: 58, arrears: 1568000 },
  { zone: 'Zone 3', employers: 32, arrears: 896000 },
  { zone: 'Zone 4', employers: 28, arrears: 654000 }
];

const mockData = [
  { id: 'EMP-301', name: 'Central Hotels', zone: 'Zone 1', arrears: 245000, lastPayment: '2024-01-15', daysOverdue: 75 },
  { id: 'EMP-302', name: 'North Manufacturing', zone: 'Zone 2', arrears: 378000, lastPayment: '2024-02-01', daysOverdue: 60 },
  { id: 'EMP-303', name: 'South Construction', zone: 'Zone 3', arrears: 202000, lastPayment: '2024-01-20', daysOverdue: 70 },
  { id: 'EMP-304', name: 'East Transport', zone: 'Zone 4', arrears: 187000, lastPayment: '2024-02-10', daysOverdue: 50 },
  { id: 'EMP-305', name: 'West Retail', zone: 'Zone 2', arrears: 198500, lastPayment: '2024-01-25', daysOverdue: 65 }
];

const exportColumns: ExportColumn[] = [
  { header: 'Employer ID', key: 'id', width: 15 },
  { header: 'Employer Name', key: 'name', width: 30 },
  { header: 'Zone', key: 'zone', width: 15 },
  { header: 'Arrears (EC$)', key: 'arrears', width: 20 },
  { header: 'Last Payment', key: 'lastPayment', width: 20 },
  { header: 'Days Overdue', key: 'daysOverdue', width: 15 },
];

export default function ArrearsPerZoneReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' },
      { label: 'Zone 4', value: 'zone4' }
    ]},
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'minAmount', label: 'Minimum Arrears', type: 'text' as const }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6" id="arrears-per-zone-report">
      <div className="flex justify-between items-start">
        <PageHeader
          title="Top Employers Based on Arrears Per Zone"
          subtitle="Arrears distribution analyzed by geographical zone"
          breadcrumbs={[
            { label: 'Employers', href: '/employers-management/dashboard' },
            { label: 'Reports' },
            { label: 'Arrears Per Zone' }
          ]}
        />
        <ExportActions
          reportTitle="Top Employers Based on Arrears Per Zone"
          fileName="arrears-per-zone"
          data={mockData}
          columns={exportColumns}
          additionalInfo={[
            { label: 'Report Date', value: new Date().toLocaleDateString() },
            { label: 'Total Zones', value: '4' },
            { label: 'Total Arrears', value: 'EC$ 4,363,000' },
          ]}
        />
      </div>

      <div className="no-print">
        <QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Total Zones" value="4" icon={MapPin} variant="info" />
        <MetricCard title="Employers in Arrears" value="163" icon={AlertTriangle} variant="warning" />
        <MetricCard title="Total Arrears" value="EC$ 4,363,000" icon={DollarSign} variant="error" />
        <MetricCard title="Highest Zone" value="Zone 2" icon={TrendingUp} variant="warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Arrears Distribution by Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="zone" stroke="#64748B" />
              <YAxis stroke="#64748B" />
              <Tooltip />
              <Legend />
              <Bar dataKey="employers" fill="#F59E0B" name="Employers" radius={[8, 8, 0, 0]} />
              <Bar dataKey="arrears" fill="#E74C3C" name="Arrears (EC$)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employers in Arrears by Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employer ID</TableHead>
                <TableHead>Employer Name</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Arrears (EC$)</TableHead>
                <TableHead>Last Payment</TableHead>
                <TableHead>Days Overdue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.id}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.zone}</TableCell>
                  <TableCell className="font-semibold text-red-600">{row.arrears.toLocaleString()}</TableCell>
                  <TableCell>{row.lastPayment}</TableCell>
                  <TableCell>{row.daysOverdue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
