import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Calendar, FileText, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { zone: 'Zone 1', deceased: 8 },
  { zone: 'Zone 2', deceased: 12 },
  { zone: 'Zone 3', deceased: 6 },
  { zone: 'Zone 4', deceased: 4 }
];

const mockData = [
  { id: 'EMP-2401', name: 'John Doe Enterprises', dateOfDeath: '2024-01-15', lastSubmission: '2023-12-31', finalArrears: 45000, officerVerified: 'J. Williams', zone: 'Zone 1' },
  { id: 'EMP-2402', name: 'Smith Trading Co', dateOfDeath: '2024-02-01', lastSubmission: '2024-01-31', finalArrears: 0, officerVerified: 'M. Thompson', zone: 'Zone 2' },
  { id: 'EMP-2403', name: 'Brown Services Ltd', dateOfDeath: '2024-01-20', lastSubmission: '2023-12-31', finalArrears: 38000, officerVerified: 'R. Davis', zone: 'Zone 3' },
  { id: 'EMP-2404', name: 'Wilson Retail', dateOfDeath: '2024-02-10', lastSubmission: '2024-01-31', finalArrears: 0, officerVerified: 'S. Martinez', zone: 'Zone 1' },
  { id: 'EMP-2405', name: 'Taylor Construction', dateOfDeath: '2024-01-25', lastSubmission: '2023-12-31', finalArrears: 52000, officerVerified: 'J. Williams', zone: 'Zone 2' }
];

export default function DeceasedEmployersReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date of Death Range', type: 'daterange' as const },
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
      title="Deceased Employers"
      subtitle="List of employers who have passed away"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Deceased Employers' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Deceased" value="30" icon={Users} variant="info" />
          <MetricCard title="This Year" value="18" icon={Calendar} variant="info" />
          <MetricCard title="With Arrears" value="12" icon={Building2} variant="warning" />
          <MetricCard title="Records Verified" value="30" icon={FileText} variant="success" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Deceased Employers by Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="zone" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="deceased" fill="#64748B" name="Deceased Employers" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Deceased Employers List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Date of Death</TableHead>
                  <TableHead>Last Submission</TableHead>
                  <TableHead>Final Arrears (EC$)</TableHead>
                  <TableHead>Officer Verified</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.dateOfDeath}</TableCell>
                    <TableCell>{row.lastSubmission}</TableCell>
                    <TableCell className={row.finalArrears > 0 ? 'text-red-600' : 'text-green-600'}>
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
