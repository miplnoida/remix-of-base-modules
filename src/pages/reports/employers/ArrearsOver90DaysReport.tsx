import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Building2, DollarSign, Scale } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { zone: 'Zone 1', employers: 28, totalArrears: 2185000 },
  { zone: 'Zone 2', employers: 35, totalArrears: 2878000 },
  { zone: 'Zone 3', employers: 20, totalArrears: 1456000 },
  { zone: 'Zone 4', employers: 16, totalArrears: 1098000 }
];

const mockData = [
  { id: 'EMP-1801', name: 'Hotels Group', arrears: 345000, dueDate: '2023-10-15', daysOverdue: 155, zone: 'Zone 1', courtStage: 'Summons Issued' },
  { id: 'EMP-1802', name: 'Manufacturing Co', arrears: 278000, dueDate: '2023-11-01', daysOverdue: 140, zone: 'Zone 2', courtStage: 'Filing Complete' },
  { id: 'EMP-1803', name: 'Construction Ltd', arrears: 356000, dueDate: '2023-10-20', daysOverdue: 150, zone: 'Zone 3', courtStage: 'Hearing Scheduled' },
  { id: 'EMP-1804', name: 'Retail Stores', arrears: 221000, dueDate: '2023-11-10', daysOverdue: 130, zone: 'Zone 1', courtStage: 'Summons Issued' },
  { id: 'EMP-1805', name: 'Transport Services', arrears: 298000, dueDate: '2023-10-25', daysOverdue: 145, zone: 'Zone 2', courtStage: 'Filing Complete' }
];

export default function ArrearsOver90DaysReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' },
      { label: 'Zone 4', value: 'zone4' }
    ]},
    { name: 'courtStage', label: 'Court Stage', type: 'select' as const, options: [
      { label: 'All Stages', value: 'all' },
      { label: 'Summons Issued', value: 'summons' },
      { label: 'Filing Complete', value: 'filing' },
      { label: 'Hearing Scheduled', value: 'hearing' }
    ]},
    { name: 'minAmount', label: 'Minimum Arrears', type: 'text' as const }
  ];

  return (
    <ReportLayout
      title="Employers in Arrears Over 90 Days"
      subtitle="Employers with payments overdue beyond 90 days - active legal proceedings"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Arrears Over 90 Days' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Employers" value="99" icon={Building2} variant="error" />
          <MetricCard title="Total Arrears" value="EC$ 7,617,000" icon={DollarSign} variant="error" />
          <MetricCard title="In Litigation" value="99" icon={Scale} variant="error" />
          <MetricCard title="Avg Days Overdue" value="147" icon={AlertTriangle} variant="error" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Over 90-Day Arrears by Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="zone" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="employers" fill="#DC2626" name="Employers" radius={[8, 8, 0, 0]} />
                <Bar dataKey="totalArrears" fill="#7F1D1D" name="Arrears (EC$)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Employers Over 90 Days in Arrears</CardTitle>
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
                  <TableHead>Court Stage</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="font-semibold text-red-800">{row.arrears.toLocaleString()}</TableCell>
                    <TableCell>{row.dueDate}</TableCell>
                    <TableCell className="font-semibold">{row.daysOverdue}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                        {row.courtStage}
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
