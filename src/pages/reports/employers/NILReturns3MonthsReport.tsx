import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Building2, Calendar, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { zone: 'Zone 1', employers: 15 },
  { zone: 'Zone 2', employers: 22 },
  { zone: 'Zone 3', employers: 12 },
  { zone: 'Zone 4', employers: 8 }
];

const mockData = [
  { id: 'EMP-2601', name: 'Seasonal Hotels Ltd', nilMonths: 3, periods: 'Jan-Mar 2024', lastPositive: 'Dec 2023', reason: 'Seasonal Operations', zone: 'Zone 1' },
  { id: 'EMP-2602', name: 'Project Construction', nilMonths: 3, periods: 'Jan-Mar 2024', lastPositive: 'Dec 2023', reason: 'Between Projects', zone: 'Zone 2' },
  { id: 'EMP-2603', name: 'Event Services Co', nilMonths: 3, periods: 'Jan-Mar 2024', lastPositive: 'Dec 2023', reason: 'Off-Season', zone: 'Zone 3' },
  { id: 'EMP-2604', name: 'Tourism Transport', nilMonths: 3, periods: 'Jan-Mar 2024', lastPositive: 'Dec 2023', reason: 'Low Season', zone: 'Zone 1' },
  { id: 'EMP-2605', name: 'Contract Services', nilMonths: 3, periods: 'Jan-Mar 2024', lastPositive: 'Dec 2023', reason: 'Contract Renewal', zone: 'Zone 2' }
];

export default function NILReturns3MonthsReport() {
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
      title="Employers Submitting NIL Returns for 3 Consecutive Months"
      subtitle="Employers with exactly 3 months of NIL returns"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'NIL Returns 3 Months' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Employers" value="57" icon={Building2} variant="warning" />
          <MetricCard title="Consecutive NIL" value="3 Months" icon={Calendar} variant="warning" />
          <MetricCard title="Requiring Review" value="57" icon={AlertCircle} variant="warning" />
          <MetricCard title="Records" value="57" icon={FileText} variant="info" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>NIL Returns (3 Months) by Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="zone" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="employers" fill="#F59E0B" name="Employers" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Employers With 3 Months NIL Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>NIL Months</TableHead>
                  <TableHead>Periods</TableHead>
                  <TableHead>Last Positive</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="font-semibold">{row.nilMonths}</TableCell>
                    <TableCell>{row.periods}</TableCell>
                    <TableCell>{row.lastPositive}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs bg-warning/15 text-warning">
                        {row.reason}
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
