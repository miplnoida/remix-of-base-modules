import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Scale, FileText, AlertTriangle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const chartData = [
  { stage: 'Summons Issued', count: 45, amount: 2850000 },
  { stage: 'Court Filing', count: 32, amount: 2150000 },
  { stage: 'Hearing Scheduled', count: 18, amount: 1450000 },
  { stage: 'Judgment Pending', count: 12, amount: 980000 }
];

const pieData = [
  { name: 'Summons Issued', value: 45 },
  { name: 'Court Filing', value: 32 },
  { name: 'Hearing Scheduled', value: 18 },
  { name: 'Judgment Pending', value: 12 }
];

const COLORS = ['#F59E0B', '#2563EB', '#0EA5E9', '#DC2626'];

const mockData = [
  { id: 'EMP-1901', name: 'Hotels Group International', caseNumber: 'LIT-2024-001', stage: 'Summons Issued', amount: 345000, filingDate: '2024-01-15', officer: 'J. Williams', zone: 'Zone 1' },
  { id: 'EMP-1902', name: 'Manufacturing Solutions', caseNumber: 'LIT-2024-002', stage: 'Court Filing', amount: 278000, filingDate: '2024-01-20', officer: 'M. Thompson', zone: 'Zone 2' },
  { id: 'EMP-1903', name: 'Construction Works Ltd', caseNumber: 'LIT-2024-003', stage: 'Hearing Scheduled', amount: 356000, filingDate: '2024-01-10', officer: 'R. Davis', zone: 'Zone 3' },
  { id: 'EMP-1904', name: 'Retail Chain Stores', caseNumber: 'LIT-2024-004', stage: 'Judgment Pending', amount: 221000, filingDate: '2024-02-01', officer: 'S. Martinez', zone: 'Zone 1' },
  { id: 'EMP-1905', name: 'Transport Co Ltd', caseNumber: 'LIT-2024-005', stage: 'Summons Issued', amount: 298000, filingDate: '2024-01-25', officer: 'J. Williams', zone: 'Zone 2' }
];

export default function UnderLitigationReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'status', label: 'Litigation Stage', type: 'select' as const, options: [
      { label: 'All Stages', value: 'all' },
      { label: 'Summons Issued', value: 'summons' },
      { label: 'Court Filing', value: 'filing' },
      { label: 'Hearing Scheduled', value: 'hearing' },
      { label: 'Judgment Pending', value: 'judgment' }
    ]},
    { name: 'courtLevel', label: 'Court Level', type: 'select' as const, options: [
      { label: 'All Courts', value: 'all' },
      { label: 'Magistrate', value: 'magistrate' },
      { label: 'High Court', value: 'high_court' }
    ]},
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' }
    ]},
    { name: 'officer', label: 'Responsible Officer', type: 'text' as const }
  ];

  return (
    <ReportLayout
      title="List of Employers Under Litigation"
      subtitle="All employers currently in active legal proceedings"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Under Litigation' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Cases" value="107" icon={Scale} variant="error" />
          <MetricCard title="Total Amount" value="EC$ 7,430,000" icon={AlertTriangle} variant="error" />
          <MetricCard title="Avg Case Value" value="EC$ 69,439" icon={TrendingUp} variant="warning" />
          <MetricCard title="Active Hearings" value="18" icon={FileText} variant="info" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Cases by Litigation Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="stage" stroke="#64748B" />
                  <YAxis stroke="#64748B" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#2563EB" name="Cases" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Case Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Employers Under Active Litigation</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Case Number</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Amount (EC$)</TableHead>
                  <TableHead>Filing Date</TableHead>
                  <TableHead>Officer</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="font-mono text-sm">{row.caseNumber}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                        {row.stage}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">{row.amount.toLocaleString()}</TableCell>
                    <TableCell>{row.filingDate}</TableCell>
                    <TableCell>{row.officer}</TableCell>
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
