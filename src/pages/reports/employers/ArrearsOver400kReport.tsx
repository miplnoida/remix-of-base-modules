import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, AlertTriangle, Building2, Scale } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { employer: 'Hotels Group', arrears: 745000 },
  { employer: 'Manufacturing', arrears: 678000 },
  { employer: 'Construction', arrears: 556000 },
  { employer: 'Retail Chain', arrears: 498500 }
];

const mockData = [
  { id: 'EMP-1201', name: 'Hotels Group International', arrears: 745000, lastPayment: '2023-09-15', daysOverdue: 195, zone: 'Zone 1', litigationStage: 'Summons Issued' },
  { id: 'EMP-1202', name: 'Manufacturing Solutions', arrears: 678000, lastPayment: '2023-10-01', daysOverdue: 180, zone: 'Zone 2', litigationStage: 'Court Filing' },
  { id: 'EMP-1203', name: 'Construction Works Ltd', arrears: 556000, lastPayment: '2023-09-20', daysOverdue: 190, zone: 'Zone 3', litigationStage: 'Judgment Pending' },
  { id: 'EMP-1204', name: 'Retail Chain Stores', arrears: 498500, lastPayment: '2023-10-10', daysOverdue: 170, zone: 'Zone 1', litigationStage: 'Summons Issued' }
];

export default function ArrearsOver400kReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' }
    ]},
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'litigationStage', label: 'Litigation Stage', type: 'select' as const, options: [
      { label: 'All Stages', value: 'all' },
      { label: 'Summons Issued', value: 'summons' },
      { label: 'Court Filing', value: 'filing' },
      { label: 'Judgment Pending', value: 'judgment' }
    ]}
  ];

  return (
    <ReportLayout
      title="Employers With Arrears Over EC$ 400,000"
      subtitle="Employers exceeding 400k arrears threshold - Active litigation"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Arrears Over 400K' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Employers" value="4" icon={Building2} variant="error" />
          <MetricCard title="Total Arrears" value="EC$ 9,950,000" icon={DollarSign} variant="error" />
          <MetricCard title="In Active Litigation" value="4" icon={Scale} variant="error" />
          <MetricCard title="Highest Arrears" value="EC$ 745,000" icon={AlertTriangle} variant="error" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Employers Over 400K Arrears</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="employer" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="arrears" fill="#991B1B" name="Arrears (EC$)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Employers With 400K+ Arrears</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Arrears (EC$)</TableHead>
                  <TableHead>Last Payment</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Litigation Stage</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-bold">{index + 1}</TableCell>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="font-semibold text-red-800">{row.arrears.toLocaleString()}</TableCell>
                    <TableCell>{row.lastPayment}</TableCell>
                    <TableCell>{row.daysOverdue}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                        {row.litigationStage}
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
