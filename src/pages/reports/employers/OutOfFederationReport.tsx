import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plane, Building2, MapPin, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const chartData = [
  { country: 'USA', employers: 8 },
  { country: 'Canada', employers: 6 },
  { country: 'UK', employers: 5 },
  { country: 'Caribbean', employers: 4 },
  { country: 'Other', employers: 3 }
];

const pieData = [
  { name: 'Relocation', value: 12 },
  { name: 'Business Expansion', value: 8 },
  { name: 'Market Exit', value: 6 }
];

const COLORS = ['hsl(var(--secondary))', 'hsl(var(--primary))', 'hsl(var(--accent))'];

const mockData = [
  { id: 'EMP-2301', name: 'Caribbean Hotels International', country: 'USA', exitDate: '2024-01-15', exitReason: 'Relocation', lastSubmission: '2023-12-31', finalStatus: 'Settled', zone: 'Zone 1' },
  { id: 'EMP-2302', name: 'Island Manufacturing Ltd', country: 'Canada', exitDate: '2024-02-01', exitReason: 'Business Expansion', lastSubmission: '2024-01-31', finalStatus: 'Arrears Pending', zone: 'Zone 2' },
  { id: 'EMP-2303', name: 'Tropical Construction Co', country: 'UK', exitDate: '2024-01-20', exitReason: 'Market Exit', lastSubmission: '2023-12-31', finalStatus: 'Settled', zone: 'Zone 3' },
  { id: 'EMP-2304', name: 'Atlantic Retail Group', country: 'Caribbean (Trinidad)', exitDate: '2024-02-10', exitReason: 'Relocation', lastSubmission: '2024-01-31', finalStatus: 'Settled', zone: 'Zone 1' },
  { id: 'EMP-2305', name: 'Coastal Transport Services', country: 'USA', exitDate: '2024-01-25', exitReason: 'Business Expansion', lastSubmission: '2023-12-31', finalStatus: 'Arrears Pending', zone: 'Zone 2' }
];

export default function OutOfFederationReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'country', label: 'Country', type: 'select' as const, options: [
      { label: 'All Countries', value: 'all' },
      { label: 'USA', value: 'usa' },
      { label: 'Canada', value: 'canada' },
      { label: 'UK', value: 'uk' },
      { label: 'Caribbean', value: 'caribbean' },
      { label: 'Other', value: 'other' }
    ]},
    { name: 'exitReason', label: 'Exit Reason', type: 'select' as const, options: [
      { label: 'All Reasons', value: 'all' },
      { label: 'Relocation', value: 'relocation' },
      { label: 'Business Expansion', value: 'expansion' },
      { label: 'Market Exit', value: 'market_exit' }
    ]},
    { name: 'dateRange', label: 'Exit Date Range', type: 'daterange' as const }
  ];

  return (
    <ReportLayout
      title="Employers Out of the Federation"
      subtitle="Employers who have relocated or exited the federation"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Out of Federation' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Relocated" value="26" icon={Plane} variant="info" />
          <MetricCard title="This Year" value="14" icon={Calendar} variant="info" />
          <MetricCard title="Accounts Settled" value="18" icon={Building2} variant="success" />
          <MetricCard title="Countries" value="8" icon={MapPin} variant="info" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Employers by Destination Country</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="country" type="category" width={100} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Bar dataKey="employers" fill="hsl(var(--primary))" name="Employers" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Exit Reasons</CardTitle>
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
                    fill="hsl(var(--primary))"
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
            <CardTitle>Employers Out of Federation</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Exit Date</TableHead>
                  <TableHead>Exit Reason</TableHead>
                  <TableHead>Last Submission</TableHead>
                  <TableHead>Final Status</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.country}</TableCell>
                    <TableCell>{row.exitDate}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs bg-secondary/10 text-secondary-foreground">
                        {row.exitReason}
                      </span>
                    </TableCell>
                    <TableCell>{row.lastSubmission}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        row.finalStatus === 'Settled' ? 'bg-primary/10 text-primary' : 'bg-accent/30 text-accent-foreground'
                      }`}>
                        {row.finalStatus}
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
