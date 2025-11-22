import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Scale, Building2, AlertTriangle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from '@/lib/chartColors';

const chartData = [
  { employer: 'ABC Trading', cases: 5 },
  { employer: 'XYZ Services', cases: 4 },
  { employer: 'Global Import', cases: 4 },
  { employer: 'Tech Solutions', cases: 3 },
  { employer: 'Retail Plus', cases: 3 },
  { employer: 'Construction', cases: 2 },
  { employer: 'Transport Co', cases: 2 },
  { employer: 'Security Ltd', cases: 2 },
  { employer: 'Hotels Group', cases: 1 },
  { employer: 'Manufacturing', cases: 1 }
];

const mockData = [
  { id: 'EMP-001', name: 'ABC Trading Ltd', zone: 'Zone 1', litigationCases: 5, totalArrears: 450000, status: 'Active' },
  { id: 'EMP-002', name: 'XYZ Services Inc', zone: 'Zone 2', litigationCases: 4, totalArrears: 380000, status: 'Active' },
  { id: 'EMP-003', name: 'Global Import Co', zone: 'Zone 3', litigationCases: 4, totalArrears: 520000, status: 'Active' },
  { id: 'EMP-004', name: 'Tech Solutions Ltd', zone: 'Zone 1', litigationCases: 3, totalArrears: 295000, status: 'Settled' },
  { id: 'EMP-005', name: 'Retail Plus Inc', zone: 'Zone 2', litigationCases: 3, totalArrears: 340000, status: 'Active' },
  { id: 'EMP-006', name: 'Construction Works', zone: 'Zone 3', litigationCases: 2, totalArrears: 185000, status: 'Active' },
  { id: 'EMP-007', name: 'Transport Co Ltd', zone: 'Zone 4', litigationCases: 2, totalArrears: 220000, status: 'Active' },
  { id: 'EMP-008', name: 'Security Services', zone: 'Zone 1', litigationCases: 2, totalArrears: 165000, status: 'Settled' },
  { id: 'EMP-009', name: 'Hotels Group', zone: 'Zone 2', litigationCases: 1, totalArrears: 95000, status: 'Active' },
  { id: 'EMP-010', name: 'Manufacturing Ltd', zone: 'Zone 3', litigationCases: 1, totalArrears: 125000, status: 'Active' }
];

export default function ByLitigationCountReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' },
      { label: 'Zone 4', value: 'zone4' }
    ]},
    { name: 'status', label: 'Status', type: 'select' as const, options: [
      { label: 'All Statuses', value: 'all' },
      { label: 'Active', value: 'active' },
      { label: 'Settled', value: 'settled' }
    ]}
  ];

  return (
    <ReportLayout
      title="Employers By Litigation Count"
      subtitle="Employers ranked by number of litigation cases"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'By Litigation Count' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Cases" value="27" icon={Scale} variant="error" />
          <MetricCard title="Employers Affected" value="10" icon={Building2} variant="warning" />
          <MetricCard title="Active Cases" value="22" icon={AlertTriangle} variant="error" />
          <MetricCard title="Total Arrears" value="XCD 2.78M" icon={TrendingUp} variant="warning" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Employers by Litigation Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.gridline} />
                <XAxis type="number" stroke={CHART_COLORS.text} />
                <YAxis dataKey="employer" type="category" width={120} stroke={CHART_COLORS.text} />
                <Tooltip />
                <Bar dataKey="cases" fill={CHART_COLORS.error} name="Litigation Cases" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Employers With Multiple Litigation Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Litigation Cases</TableHead>
                  <TableHead>Total Arrears (XCD)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.zone}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        row.litigationCases >= 4 ? 'bg-red-100 text-red-800' : 
                        row.litigationCases >= 2 ? 'bg-orange-100 text-orange-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {row.litigationCases}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">{row.totalArrears.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        row.status === 'Active' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
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