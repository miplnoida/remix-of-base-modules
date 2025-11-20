import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { XCircle, Building2, Calendar, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { zone: 'Zone 1', ceased: 28, bankruptcy: 12, voluntary: 10, other: 6 },
  { zone: 'Zone 2', ceased: 35, bankruptcy: 15, voluntary: 12, other: 8 },
  { zone: 'Zone 3', ceased: 18, bankruptcy: 8, voluntary: 6, other: 4 },
  { zone: 'Zone 4', ceased: 14, bankruptcy: 6, voluntary: 5, other: 3 }
];

const mockData = [
  { id: 'EMP-2201', name: 'Sunset Hotels Ltd', ceasedDate: '2024-01-15', reason: 'Bankruptcy', lastSubmission: '2023-12-31', finalArrears: 145000, officerVerified: 'J. Williams', zone: 'Zone 1' },
  { id: 'EMP-2202', name: 'Old Manufacturing Co', ceasedDate: '2024-02-01', reason: 'Voluntary Closure', lastSubmission: '2024-01-31', finalArrears: 0, officerVerified: 'M. Thompson', zone: 'Zone 2' },
  { id: 'EMP-2203', name: 'Legacy Construction', ceasedDate: '2024-01-20', reason: 'Business Sold', lastSubmission: '2023-12-31', finalArrears: 78000, officerVerified: 'R. Davis', zone: 'Zone 3' },
  { id: 'EMP-2204', name: 'Former Retail Chain', ceasedDate: '2024-02-10', reason: 'Bankruptcy', lastSubmission: '2024-01-31', finalArrears: 256000, officerVerified: 'S. Martinez', zone: 'Zone 1' },
  { id: 'EMP-2205', name: 'Closed Transport Co', ceasedDate: '2024-01-25', reason: 'Economic Conditions', lastSubmission: '2023-12-31', finalArrears: 98000, officerVerified: 'J. Williams', zone: 'Zone 2' }
];

export default function CeasedEmployersReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'ceasedDateRange', label: 'Ceased Date Range', type: 'daterange' as const },
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' },
      { label: 'Zone 4', value: 'zone4' }
    ]},
    { name: 'reason', label: 'Cessation Reason', type: 'select' as const, options: [
      { label: 'All Reasons', value: 'all' },
      { label: 'Bankruptcy', value: 'bankruptcy' },
      { label: 'Voluntary Closure', value: 'voluntary' },
      { label: 'Business Sold', value: 'sold' },
      { label: 'Economic Conditions', value: 'economic' }
    ]}
  ];

  return (
    <ReportLayout
      title="List of Ceased Employers"
      subtitle="Employers who have ceased operations or closed business"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Ceased Employers' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Ceased" value="95" icon={XCircle} variant="error" />
          <MetricCard title="This Year" value="32" icon={Calendar} variant="warning" />
          <MetricCard title="With Arrears" value="58" icon={Building2} variant="error" />
          <MetricCard title="Records Verified" value="95" icon={FileText} variant="success" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Ceased Employers by Zone and Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="zone" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="bankruptcy" fill="#DC2626" name="Bankruptcy" radius={[8, 8, 0, 0]} />
                <Bar dataKey="voluntary" fill="#F59E0B" name="Voluntary" radius={[8, 8, 0, 0]} />
                <Bar dataKey="other" fill="#64748B" name="Other" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Ceased Employers List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Ceased Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Last Submission</TableHead>
                  <TableHead>Final Arrears (EC$)</TableHead>
                  <TableHead>Verified By</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.ceasedDate}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                        {row.reason}
                      </span>
                    </TableCell>
                    <TableCell>{row.lastSubmission}</TableCell>
                    <TableCell className={row.finalArrears > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                      {row.finalArrears > 0 ? row.finalArrears.toLocaleString() : 'Nil'}
                    </TableCell>
                    <TableCell>{row.officerVerified}</TableCell>
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
