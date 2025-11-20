import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Award, TrendingUp, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { employer: 'Hotels Group', amount: 145000 },
  { employer: 'Manufacturing', amount: 128000 },
  { employer: 'Retail Chain', amount: 98500 },
  { employer: 'Construction', amount: 87200 },
  { employer: 'Security Ltd', amount: 76400 }
];

const mockData = [
  { id: 'EMP-601', name: 'Hotels Group International', month: 'March 2024', contributions: 145000, employees: 425, zone: 'Zone 1' },
  { id: 'EMP-602', name: 'Manufacturing Solutions', month: 'March 2024', contributions: 128000, employees: 380, zone: 'Zone 2' },
  { id: 'EMP-603', name: 'Retail Chain Stores', month: 'March 2024', contributions: 98500, employees: 342, zone: 'Zone 1' },
  { id: 'EMP-604', name: 'Construction Works Co', month: 'March 2024', contributions: 87200, employees: 298, zone: 'Zone 3' },
  { id: 'EMP-605', name: 'Security Services Ltd', month: 'March 2024', contributions: 76400, employees: 265, zone: 'Zone 2' }
];

export default function ByMonthlyContributionsReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'month', label: 'Month', type: 'text' as const },
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' }
    ]},
    { name: 'industry', label: 'Industry', type: 'text' as const }
  ];

  return (
    <ReportLayout
      title="Top Employers Based on Contributions Submitted Per Month"
      subtitle="Highest contributing employers by monthly submissions"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'By Monthly Contributions' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Contributions" value="EC$ 535,100" icon={DollarSign} variant="success" />
          <MetricCard title="Top Contributor" value="EC$ 145,000" icon={Award} variant="success" />
          <MetricCard title="Average Per Employer" value="EC$ 107,020" icon={TrendingUp} variant="info" />
          <MetricCard title="Current Month" value="March 2024" icon={Calendar} variant="info" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Monthly Contributors</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="employer" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="amount" fill="#009B4C" name="Contributions (EC$)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Monthly Contribution Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Contributions (EC$)</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-bold">{index + 1}</TableCell>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.month}</TableCell>
                    <TableCell className="font-semibold">{row.contributions.toLocaleString()}</TableCell>
                    <TableCell>{row.employees}</TableCell>
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
