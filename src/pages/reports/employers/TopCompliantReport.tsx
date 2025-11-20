import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Award, CheckCircle, TrendingUp, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const chartData = [
  { employer: 'Tech Solutions', score: 98 },
  { employer: 'Finance Corp', score: 96 },
  { employer: 'Services Ltd', score: 95 },
  { employer: 'Retail Plus', score: 94 },
  { employer: 'Manufacturing', score: 93 }
];

const pieData = [
  { name: 'On-Time Payment', value: 98 },
  { name: 'Zero Arrears', value: 100 },
  { name: 'Accurate Submissions', value: 96 }
];

const COLORS = ['#009B4C', '#2563EB', '#0EA5E9'];

const mockData = [
  { id: 'EMP-1401', name: 'Tech Solutions Inc', complianceScore: 98, onTimePayment: 100, zeroArrears: true, accurateSubmissions: 98, zone: 'Zone 1' },
  { id: 'EMP-1402', name: 'Finance Corporation', complianceScore: 96, onTimePayment: 98, zeroArrears: true, accurateSubmissions: 96, zone: 'Zone 2' },
  { id: 'EMP-1403', name: 'Services Ltd', complianceScore: 95, onTimePayment: 96, zeroArrears: true, accurateSubmissions: 95, zone: 'Zone 1' },
  { id: 'EMP-1404', name: 'Retail Plus Inc', complianceScore: 94, onTimePayment: 95, zeroArrears: true, accurateSubmissions: 94, zone: 'Zone 3' },
  { id: 'EMP-1405', name: 'Manufacturing Co', complianceScore: 93, onTimePayment: 94, zeroArrears: true, accurateSubmissions: 93, zone: 'Zone 2' }
];

export default function TopCompliantReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'complianceType', label: 'Compliance Type', type: 'select' as const, options: [
      { label: 'All Types', value: 'all' },
      { label: 'Payment', value: 'payment' },
      { label: 'Submissions', value: 'submissions' },
      { label: 'Overall', value: 'overall' }
    ]},
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' }
    ]}
  ];

  return (
    <ReportLayout
      title="Top Compliant Employers"
      subtitle="Employers with highest compliance ratings across all criteria"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Top Compliant' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Top Compliant" value="156" icon={Award} variant="success" />
          <MetricCard title="Perfect Score" value="24" icon={CheckCircle} variant="success" />
          <MetricCard title="Avg Compliance" value="87.5%" icon={TrendingUp} variant="success" />
          <MetricCard title="Above 90%" value="89" icon={Target} variant="success" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Compliant Employers</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" stroke="#64748B" />
                  <YAxis dataKey="employer" type="category" width={120} stroke="#64748B" />
                  <Tooltip />
                  <Bar dataKey="score" fill="#009B4C" name="Compliance Score %" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Compliance Criteria Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Compliant Employers Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Compliance Score</TableHead>
                  <TableHead>On-Time Payment %</TableHead>
                  <TableHead>Zero Arrears</TableHead>
                  <TableHead>Accurate Submissions %</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-bold">{index + 1}</TableCell>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="font-semibold text-green-600">{row.complianceScore}%</TableCell>
                    <TableCell>{row.onTimePayment}%</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        {row.zeroArrears ? 'Yes' : 'No'}
                      </span>
                    </TableCell>
                    <TableCell>{row.accurateSubmissions}%</TableCell>
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
