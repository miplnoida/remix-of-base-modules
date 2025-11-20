import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Building2, Calendar, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { zone: 'Zone 1', employers: 8, avgMonths: 5.2 },
  { zone: 'Zone 2', employers: 12, avgMonths: 6.1 },
  { zone: 'Zone 3', employers: 6, avgMonths: 4.8 },
  { zone: 'Zone 4', employers: 4, avgMonths: 5.5 }
];

const mockData = [
  { id: 'EMP-2701', name: 'Inactive Hotels Ltd', nilMonths: 8, periods: 'Aug 2023 - Mar 2024', lastPositive: 'Jul 2023', status: 'Investigation Required', zone: 'Zone 1' },
  { id: 'EMP-2702', name: 'Dormant Manufacturing', nilMonths: 12, periods: 'Apr 2023 - Mar 2024', lastPositive: 'Mar 2023', status: 'Cessation Review', zone: 'Zone 2' },
  { id: 'EMP-2703', name: 'Suspended Services', nilMonths: 6, periods: 'Oct 2023 - Mar 2024', lastPositive: 'Sep 2023', status: 'Investigation Required', zone: 'Zone 3' },
  { id: 'EMP-2704', name: 'Closed Retail', nilMonths: 10, periods: 'Jun 2023 - Mar 2024', lastPositive: 'May 2023', status: 'Cessation Review', zone: 'Zone 1' },
  { id: 'EMP-2705', name: 'Halted Construction', nilMonths: 5, periods: 'Nov 2023 - Mar 2024', lastPositive: 'Oct 2023', status: 'Investigation Required', zone: 'Zone 2' }
];

export default function NILReturnsOver3MonthsReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' },
      { label: 'Zone 4', value: 'zone4' }
    ]},
    { name: 'status', label: 'Status', type: 'select' as const, options: [
      { label: 'All Status', value: 'all' },
      { label: 'Investigation Required', value: 'investigation' },
      { label: 'Cessation Review', value: 'cessation' }
    ]},
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const }
  ];

  return (
    <ReportLayout
      title="Employers Submitting NIL Returns for Over 3 Months"
      subtitle="Employers with prolonged NIL returns requiring investigation"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'NIL Returns Over 3 Months' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Employers" value="30" icon={Building2} variant="error" />
          <MetricCard title="Avg NIL Months" value="7.2" icon={Calendar} variant="error" />
          <MetricCard title="Investigation Required" value="18" icon={AlertTriangle} variant="error" />
          <MetricCard title="Cessation Review" value="12" icon={XCircle} variant="error" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>NIL Returns (Over 3 Months) by Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="zone" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="employers" fill="#DC2626" name="Employers" radius={[8, 8, 0, 0]} />
                <Bar dataKey="avgMonths" fill="#F59E0B" name="Avg NIL Months" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Employers With Prolonged NIL Returns</CardTitle>
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
                  <TableHead>Status</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="font-semibold text-red-600">{row.nilMonths}</TableCell>
                    <TableCell>{row.periods}</TableCell>
                    <TableCell>{row.lastPositive}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        row.status === 'Cessation Review' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
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
