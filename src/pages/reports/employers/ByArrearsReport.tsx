import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, AlertTriangle, Building2, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { employer: 'Legacy Mfg', arrears: 285000 },
  { employer: 'Old School', arrears: 248000 },
  { employer: 'Historic Hotels', arrears: 196000 },
  { employer: 'Classic Trans', arrears: 175000 },
  { employer: 'Traditional', arrears: 142000 },
  { employer: 'Vintage Co', arrears: 128000 },
  { employer: 'Heritage Ltd', arrears: 115000 },
  { employer: 'Pioneer Inc', arrears: 98000 },
  { employer: 'Founder Co', arrears: 87000 },
  { employer: 'Original Ltd', arrears: 76000 }
];

const mockData = [
  { id: 'EMP-701', name: 'Legacy Manufacturing Ltd', zone: 'Zone 1', arrears: 285000, monthsOverdue: 12, status: 'Legal Action' },
  { id: 'EMP-702', name: 'Old School Trading Co', zone: 'Zone 2', arrears: 248000, monthsOverdue: 10, status: 'Legal Action' },
  { id: 'EMP-703', name: 'Historic Hotels Group', zone: 'Zone 1', arrears: 196000, monthsOverdue: 9, status: 'Escalated' },
  { id: 'EMP-704', name: 'Classic Transport Ltd', zone: 'Zone 3', arrears: 175000, monthsOverdue: 8, status: 'Legal Action' },
  { id: 'EMP-705', name: 'Traditional Retail Inc', zone: 'Zone 2', arrears: 142000, monthsOverdue: 7, status: 'Escalated' }
];

export default function ByArrearsReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' }
    ]}
  ];

  return (
    <ReportLayout
      title="Top Employers Based on Arrears Amount"
      subtitle="Employers with highest outstanding contribution arrears"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'By Arrears' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Arrears" value="EC$ 1,550,000" icon={DollarSign} variant="error" />
          <MetricCard title="Top Arrears" value="EC$ 285,000" icon={AlertTriangle} variant="error" />
          <MetricCard title="Employers" value="10" icon={Building2} variant="warning" />
          <MetricCard title="Avg Months Overdue" value="9.1" icon={TrendingDown} variant="error" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Employers by Arrears Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" stroke="#64748B" />
                <YAxis dataKey="employer" type="category" width={120} stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="arrears" fill="#E74C3C" name="Arrears (EC$)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Employers with Highest Arrears</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Arrears (EC$)</TableHead>
                  <TableHead>Months Overdue</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-bold">{index + 1}</TableCell>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="font-semibold text-red-600">{row.arrears.toLocaleString()}</TableCell>
                    <TableCell>{row.monthsOverdue}</TableCell>
                    <TableCell>{row.zone}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        row.status === 'Legal Action' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {row.status}
                      </span>
                    </TableCell>
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
