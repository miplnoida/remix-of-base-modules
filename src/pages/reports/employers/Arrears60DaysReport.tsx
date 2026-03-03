import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Building2, DollarSign, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { zone: 'Zone 1', employers: 18, totalArrears: 685000 },
  { zone: 'Zone 2', employers: 22, totalArrears: 878000 },
  { zone: 'Zone 3', employers: 14, totalArrears: 456000 },
  { zone: 'Zone 4', employers: 10, totalArrears: 398000 }
];

const mockData = [
  { id: 'EMP-1601', name: 'Hotels Group', arrears: 85000, dueDate: '2024-01-15', daysOverdue: 55, zone: 'Zone 1', escalationLevel: 'Medium' },
  { id: 'EMP-1602', name: 'Manufacturing Co', arrears: 78000, dueDate: '2024-01-20', daysOverdue: 50, zone: 'Zone 2', escalationLevel: 'Medium' },
  { id: 'EMP-1603', name: 'Construction Ltd', arrears: 92000, dueDate: '2024-01-12', daysOverdue: 58, zone: 'Zone 3', escalationLevel: 'High' },
  { id: 'EMP-1604', name: 'Retail Stores', arrears: 71000, dueDate: '2024-01-22', daysOverdue: 48, zone: 'Zone 1', escalationLevel: 'Medium' },
  { id: 'EMP-1605', name: 'Transport Services', arrears: 88000, dueDate: '2024-01-17', daysOverdue: 53, zone: 'Zone 2', escalationLevel: 'Medium' }
];

export default function Arrears60DaysReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'zone', label: 'Zone', type: 'select' as const, options: [
      { label: 'All Zones', value: 'all' },
      { label: 'Zone 1', value: 'zone1' },
      { label: 'Zone 2', value: 'zone2' },
      { label: 'Zone 3', value: 'zone3' },
      { label: 'Zone 4', value: 'zone4' }
    ]},
    { name: 'escalation', label: 'Escalation Level', type: 'select' as const, options: [
      { label: 'All Levels', value: 'all' },
      { label: 'Medium', value: 'medium' },
      { label: 'High', value: 'high' }
    ]},
    { name: 'industry', label: 'Industry', type: 'text' as const }
  ];

  return (
    <ReportLayout
      title="Employers in Arrears for 60 Days"
      subtitle="Employers with payments overdue by 60 days - escalation required"
      breadcrumbs={[
        { label: 'Employers', href: '/employers-management/dashboard' },
        { label: 'Reports' },
        { label: 'Arrears 60 Days' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Employers" value="64" icon={Building2} variant="error" />
          <MetricCard title="Total Arrears" value="EC$ 2,417,000" icon={DollarSign} variant="error" />
          <MetricCard title="Avg Days Overdue" value="57" icon={Calendar} variant="error" />
          <MetricCard title="High Priority" value="28" icon={AlertTriangle} variant="error" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>60-Day Arrears by Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="zone" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Bar dataKey="employers" fill="hsl(var(--accent))" name="Employers" radius={[8, 8, 0, 0]} />
                <Bar dataKey="totalArrears" fill="hsl(var(--destructive))" name="Arrears (EC$)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Employers 60 Days in Arrears</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Arrears (EC$)</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Escalation</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="font-semibold text-destructive">{row.arrears.toLocaleString()}</TableCell>
                    <TableCell>{row.dueDate}</TableCell>
                    <TableCell>{row.daysOverdue}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        row.escalationLevel === 'High' ? 'bg-destructive/10 text-destructive' : 'bg-accent/30 text-accent-foreground'
                      }`}>
                        {row.escalationLevel}
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
