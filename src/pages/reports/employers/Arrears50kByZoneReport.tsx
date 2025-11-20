import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, MapPin, Building2, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const chartData = [
  { zone: 'Zone 1', employers: 15, totalArrears: 1845000 },
  { zone: 'Zone 2', employers: 18, totalArrears: 2268000 },
  { zone: 'Zone 3', employers: 9, totalArrears: 986000 },
  { zone: 'Zone 4', employers: 6, totalArrears: 754000 }
];

const mockData = [
  { id: 'EMP-1301', name: 'Hotels Group', zone: 'Zone 1', arrears: 245000, lastPayment: '2024-01-15', employees: 425 },
  { id: 'EMP-1302', name: 'Manufacturing Co', zone: 'Zone 2', arrears: 378000, lastPayment: '2024-02-01', employees: 380 },
  { id: 'EMP-1303', name: 'Construction Ltd', zone: 'Zone 3', arrears: 202000, lastPayment: '2024-01-20', employees: 298 },
  { id: 'EMP-1304', name: 'Retail Stores', zone: 'Zone 1', arrears: 198500, lastPayment: '2024-02-10', employees: 342 },
  { id: 'EMP-1305', name: 'Transport Services', zone: 'Zone 2', arrears: 187000, lastPayment: '2024-01-25', employees: 265 }
];

export default function Arrears50kByZoneReport() {
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
    <ReportLayout
      title="Employers With Arrears Over 50K+ By Zone"
      subtitle="Zone-wise distribution of employers with 50k+ arrears"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Arrears 50K+ By Zone' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Zones" value="4" icon={MapPin} variant="info" />
          <MetricCard title="Total Employers" value="48" icon={Building2} variant="error" />
          <MetricCard title="Total Arrears" value="EC$ 5,853,000" icon={DollarSign} variant="error" />
          <MetricCard title="Highest Zone" value="Zone 2" icon={TrendingUp} variant="warning" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>50K+ Arrears Distribution by Zone</CardTitle>
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
                <Bar dataKey="totalArrears" fill="#E74C3C" name="Total Arrears (EC$)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Employers With 50K+ Arrears by Zone</CardTitle>
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
                  <TableHead>Employees</TableHead>
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
