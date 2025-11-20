import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, DollarSign, TrendingUp, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { zone: 'Zone 1', active: 18, completed: 12, defaulted: 3 },
  { zone: 'Zone 2', active: 22, completed: 15, defaulted: 5 },
  { zone: 'Zone 3', active: 14, completed: 9, defaulted: 2 },
  { zone: 'Zone 4', active: 10, completed: 7, defaulted: 1 }
];

const mockData = [
  { id: 'EMP-2001', name: 'Hotels Group', planAmount: 345000, paidAmount: 172500, installments: 24, paidInstallments: 12, nextDue: '2024-04-15', status: 'Active', zone: 'Zone 1' },
  { id: 'EMP-2002', name: 'Manufacturing Co', planAmount: 278000, paidAmount: 185333, installments: 18, paidInstallments: 12, nextDue: '2024-04-20', status: 'Active', zone: 'Zone 2' },
  { id: 'EMP-2003', name: 'Construction Ltd', planAmount: 156000, paidAmount: 156000, installments: 12, paidInstallments: 12, nextDue: 'Completed', status: 'Completed', zone: 'Zone 3' },
  { id: 'EMP-2004', name: 'Retail Stores', planAmount: 221000, paidAmount: 110500, installments: 20, paidInstallments: 10, nextDue: '2024-04-10', status: 'Active', zone: 'Zone 1' },
  { id: 'EMP-2005', name: 'Transport Services', planAmount: 198000, paidAmount: 99000, installments: 16, paidInstallments: 8, nextDue: '2024-04-18', status: 'Active', zone: 'Zone 2' }
];

export default function WithPaymentPlansReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'activePlans', label: 'Plan Status', type: 'select' as const, options: [
      { label: 'All Status', value: 'all' },
      { label: 'Active', value: 'active' },
      { label: 'Completed', value: 'completed' },
      { label: 'Defaulted', value: 'defaulted' }
    ]},
    { name: 'officer', label: 'Responsible Officer', type: 'text' as const },
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
      title="List of Employers With Payment Plans"
      subtitle="All employers enrolled in active or completed payment plans"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'With Payment Plans' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Active Plans" value="64" icon={Calendar} variant="info" />
          <MetricCard title="Total Plan Value" value="EC$ 3,850,000" icon={DollarSign} variant="info" />
          <MetricCard title="Completed Plans" value="43" icon={CheckCircle} variant="success" />
          <MetricCard title="Total Recovered" value="EC$ 2,120,000" icon={TrendingUp} variant="success" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Payment Plans by Zone and Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="zone" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="active" fill="#2563EB" name="Active" radius={[8, 8, 0, 0]} />
                <Bar dataKey="completed" fill="#009B4C" name="Completed" radius={[8, 8, 0, 0]} />
                <Bar dataKey="defaulted" fill="#EF4444" name="Defaulted" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Employers With Payment Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Plan Amount (EC$)</TableHead>
                  <TableHead>Paid Amount (EC$)</TableHead>
                  <TableHead>Installments</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="font-semibold">{row.planAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-green-600">{row.paidAmount.toLocaleString()}</TableCell>
                    <TableCell>{row.paidInstallments}/{row.installments}</TableCell>
                    <TableCell>{row.nextDue}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        row.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        row.status === 'Active' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {row.status}
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
