import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileCheck, DollarSign, TrendingDown, Building2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from '@/lib/chartColors';

const trendData = [
  { month: 'Jan', waivers: 5, amount: 45000 },
  { month: 'Feb', waivers: 7, amount: 62000 },
  { month: 'Mar', waivers: 4, amount: 38000 },
  { month: 'Apr', waivers: 9, amount: 75000 },
  { month: 'May', waivers: 6, amount: 51000 },
  { month: 'Jun', waivers: 8, amount: 68000 }
];

const mockData = [
  { id: 'W-001', employer: 'ABC Trading Ltd', requestDate: '2024-06-01', approvedDate: '2024-06-15', amount: 15000, reason: 'Financial Hardship' },
  { id: 'W-002', employer: 'XYZ Services', requestDate: '2024-06-03', approvedDate: '2024-06-18', amount: 12000, reason: 'Natural Disaster Impact' },
  { id: 'W-003', employer: 'Global Import Co', requestDate: '2024-06-05', approvedDate: '2024-06-20', amount: 18000, reason: 'Economic Downturn' },
  { id: 'W-004', employer: 'Tech Solutions', requestDate: '2024-06-08', approvedDate: '2024-06-22', amount: 9500, reason: 'Business Restructuring' },
  { id: 'W-005', employer: 'Retail Plus Inc', requestDate: '2024-06-10', approvedDate: '2024-06-24', amount: 13500, reason: 'Financial Hardship' }
];

export default function WaiversGrantedReport() {
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
    { name: 'reason', label: 'Waiver Reason', type: 'select' as const, options: [
      { label: 'All Reasons', value: 'all' },
      { label: 'Financial Hardship', value: 'hardship' },
      { label: 'Natural Disaster', value: 'disaster' },
      { label: 'Economic Downturn', value: 'economic' }
    ]}
  ];

  return (
    <ReportLayout
      title="Waivers Granted to Employers"
      subtitle="Penalty and fee waivers approved for employers"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Waivers Granted' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Waivers" value="39" icon={FileCheck} variant="info" />
          <MetricCard title="Total Amount Waived" value="XCD 339,000" icon={DollarSign} variant="warning" />
          <MetricCard title="Employers Benefited" value="35" icon={Building2} variant="info" />
          <MetricCard title="Avg Waiver Amount" value="XCD 8,692" icon={TrendingDown} variant="default" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Waivers Granted Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.gridline} />
                  <XAxis dataKey="month" stroke={CHART_COLORS.text} />
                  <YAxis stroke={CHART_COLORS.text} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="waivers" stroke={CHART_COLORS.primary} strokeWidth={2} name="Waivers" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Waiver Amounts by Month</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.gridline} />
                  <XAxis dataKey="month" stroke={CHART_COLORS.text} />
                  <YAxis stroke={CHART_COLORS.text} />
                  <Tooltip />
                  <Bar dataKey="amount" fill={CHART_COLORS.blue} name="Amount (XCD)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Recent Waivers Granted</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waiver ID</TableHead>
                  <TableHead>Employer</TableHead>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Approved Date</TableHead>
                  <TableHead>Amount (XCD)</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.employer}</TableCell>
                    <TableCell>{row.requestDate}</TableCell>
                    <TableCell>{row.approvedDate}</TableCell>
                    <TableCell className="font-semibold">{row.amount.toLocaleString()}</TableCell>
                    <TableCell>{row.reason}</TableCell>
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