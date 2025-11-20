import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { employer: 'Retail Plus', turnover: 28.5 },
  { employer: 'Security Co', turnover: 24.8 },
  { employer: 'Construction', turnover: 22.3 },
  { employer: 'Transport Ltd', turnover: 19.6 },
  { employer: 'Hotels Group', turnover: 18.4 }
];

const mockData = [
  { id: 'EMP-401', name: 'Retail Plus Inc', industry: 'Retail', openingEmp: 120, closingEmp: 94, turnover: 28.5, zone: 'Zone 2' },
  { id: 'EMP-402', name: 'Security Services', industry: 'Security', openingEmp: 85, closingEmp: 67, turnover: 24.8, zone: 'Zone 1' },
  { id: 'EMP-403', name: 'Construction Works', industry: 'Construction', openingEmp: 150, closingEmp: 122, turnover: 22.3, zone: 'Zone 3' },
  { id: 'EMP-404', name: 'Transport Co Ltd', industry: 'Transport', openingEmp: 95, closingEmp: 79, turnover: 19.6, zone: 'Zone 1' },
  { id: 'EMP-405', name: 'Hotels Group', industry: 'Hospitality', openingEmp: 200, closingEmp: 168, turnover: 18.4, zone: 'Zone 2' }
];

export default function EmployeeTurnoverReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'industry', label: 'Industry', type: 'text' as const },
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' }
    ]}
  ];

  return (
    <ReportLayout
      title="Top Employers Based on Employee Turnover"
      subtitle="Employers with highest employee turnover percentage"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Employee Turnover' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Highest Turnover" value="28.5%" icon={TrendingDown} variant="error" />
          <MetricCard title="Average Turnover" value="18.7%" icon={Activity} variant="warning" />
          <MetricCard title="Total Employers" value="156" icon={Users} variant="info" />
          <MetricCard title="Above 20%" value="32" icon={TrendingUp} variant="warning" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Employers by Turnover Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" stroke="#64748B" />
                <YAxis dataKey="employer" type="category" width={120} stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="turnover" fill="#F59E0B" name="Turnover %" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Employee Turnover Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Opening Employees</TableHead>
                  <TableHead>Closing Employees</TableHead>
                  <TableHead>Turnover %</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.industry}</TableCell>
                    <TableCell>{row.openingEmp}</TableCell>
                    <TableCell>{row.closingEmp}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        row.turnover >= 20 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {row.turnover}%
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
