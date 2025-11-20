import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Building2, DollarSign, Scale } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { zone: 'Zone 1', employers: 22, totalArrears: 1285000 },
  { zone: 'Zone 2', employers: 28, totalArrears: 1678000 },
  { zone: 'Zone 3', employers: 16, totalArrears: 956000 },
  { zone: 'Zone 4', employers: 12, totalArrears: 698000 }
];

const mockData = [
  { id: 'EMP-1701', name: 'Hotels Group', arrears: 145000, dueDate: '2023-12-15', daysOverdue: 85, zone: 'Zone 1', legalAction: 'Pending' },
  { id: 'EMP-1702', name: 'Manufacturing Co', arrears: 128000, dueDate: '2023-12-20', daysOverdue: 80, zone: 'Zone 2', legalAction: 'Pending' },
  { id: 'EMP-1703', name: 'Construction Ltd', arrears: 156000, dueDate: '2023-12-12', daysOverdue: 88, zone: 'Zone 3', legalAction: 'Initiated' },
  { id: 'EMP-1704', name: 'Retail Stores', arrears: 121000, dueDate: '2023-12-22', daysOverdue: 78, zone: 'Zone 1', legalAction: 'Pending' },
  { id: 'EMP-1705', name: 'Transport Services', arrears: 138000, dueDate: '2023-12-17', daysOverdue: 83, zone: 'Zone 2', legalAction: 'Pending' }
];

export default function Arrears90DaysReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' },
      { label: 'Zone 4', value: 'zone4' }
    ]},
    { name: 'legalAction', label: 'Legal Action', type: 'select' as const, options: [
      { label: 'All Status', value: 'all' },
      { label: 'Pending', value: 'pending' },
      { label: 'Initiated', value: 'initiated' }
    ]},
    { name: 'industry', label: 'Industry', type: 'text' as const }
  ];

  return (
    <ReportLayout
      title="Employers in Arrears for 90 Days"
      subtitle="Employers with payments overdue by 90 days - legal action imminent"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Arrears 90 Days' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Employers" value="78" icon={Building2} variant="error" />
          <MetricCard title="Total Arrears" value="EC$ 4,617,000" icon={DollarSign} variant="error" />
          <MetricCard title="Legal Action Pending" value="68" icon={Scale} variant="error" />
          <MetricCard title="Legal Action Started" value="10" icon={AlertTriangle} variant="error" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>90-Day Arrears by Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="zone" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="employers" fill="#DC2626" name="Employers" radius={[8, 8, 0, 0]} />
                <Bar dataKey="totalArrears" fill="#991B1B" name="Arrears (EC$)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Employers 90 Days in Arrears</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Arrears (EC$)</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Legal Action</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="font-semibold text-red-700">{row.arrears.toLocaleString()}</TableCell>
                    <TableCell>{row.dueDate}</TableCell>
                    <TableCell>{row.daysOverdue}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        row.legalAction === 'Initiated' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {row.legalAction}
                      </span>
                    </TableCell>
                    <TableCell>{row.zone}</TableCell>
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
