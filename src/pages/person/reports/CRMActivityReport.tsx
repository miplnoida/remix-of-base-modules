import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Phone, AlertCircle } from 'lucide-react';
import { CHART_COLORS, CHART_STYLES } from '@/lib/chartColors';

const mockData = {
  summary: { totalInteractions: 1245, complaintRate: 12.5, avgResolutionTime: 3.2 },
  byType: [
    { name: 'Phone Call', value: 456 },
    { name: 'Walk-in', value: 389 },
    { name: 'Email', value: 234 },
    { name: 'Complaint', value: 166 }
  ],
  details: [
    { id: 'INT-001', type: 'Phone Call', officer: 'Officer A', outcome: 'Resolved', date: '2024-05-15' }
  ]
};

export default function CRMActivityReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  return (
    <ReportLayout
      title="Customer Relationship Module Activity"
      breadcrumbs={[{ label: 'Insured Persons', href: '/person/management' }, { label: 'Reports' }, { label: 'CRM Activity' }]}
      filterPanel={<QueryByFilter fields={[{ name: 'dateRange', label: 'Date Range', type: 'daterange' as const }]} onFilter={setFilters} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Total Interactions" value={mockData.summary.totalInteractions.toString()} icon={Activity} variant="info" />
          <MetricCard title="Complaint Rate" value={`${mockData.summary.complaintRate}%`} icon={AlertCircle} variant="warning" />
          <MetricCard title="Avg. Resolution Time" value={`${mockData.summary.avgResolutionTime} days`} icon={Phone} variant="info" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader><CardTitle>Interactions by Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={mockData.byType} cx="50%" cy="50%" labelLine={false} label={(entry) => `${entry.name}: ${entry.value}`} outerRadius={80} dataKey="value">
                  {mockData.byType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={[CHART_COLORS.primary, CHART_COLORS.blue, CHART_COLORS.teal, CHART_COLORS.gold][index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader><CardTitle>Interaction Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Officer</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.details.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.officer}</TableCell>
                    <TableCell><span className="text-success font-semibold">{row.outcome}</span></TableCell>
                    <TableCell>{row.date}</TableCell>
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
