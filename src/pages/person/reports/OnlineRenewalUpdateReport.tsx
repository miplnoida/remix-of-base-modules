import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { CHART_COLORS, CHART_STYLES } from '@/lib/chartColors';

// Mock data
const mockData = {
  summary: {
    totalRenewals: 234,
    totalUpdates: 189,
    approvalRate: 94.2,
    avgProcessingTime: 2.8
  },
  timeline: [
    { month: 'Jan', renewals: 45, updates: 38 },
    { month: 'Feb', renewals: 52, updates: 41 },
    { month: 'Mar', renewals: 48, updates: 35 },
    { month: 'Apr', renewals: 55, updates: 44 },
    { month: 'May', renewals: 34, updates: 31 }
  ],
  byStatus: [
    { name: 'Approved', value: 398 },
    { name: 'Rejected', value: 25 }
  ],
  byChannel: [
    { channel: 'Web Portal', count: 265 },
    { channel: 'Mobile App', count: 98 },
    { channel: 'Email', count: 60 }
  ],
  details: [
    { personId: 'IP-2024-001', name: 'John Smith', date: '2024-05-15', type: 'Renewal', channel: 'Web Portal', status: 'Approved', verifiedBy: 'Officer A' },
    { personId: 'IP-2024-002', name: 'Maria Johnson', date: '2024-05-14', type: 'Update', channel: 'Mobile App', status: 'Approved', verifiedBy: 'Officer B' },
    { personId: 'IP-2024-003', name: 'David Brown', date: '2024-05-13', type: 'Renewal', channel: 'Web Portal', status: 'Rejected', verifiedBy: 'Officer A' },
    { personId: 'IP-2024-004', name: 'Sarah Wilson', date: '2024-05-12', type: 'Update', channel: 'Email', status: 'Approved', verifiedBy: 'Officer C' }
  ]
};

export default function OnlineRenewalUpdateReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'type', label: 'Type', type: 'select' as const, options: [
      { label: 'Renewal', value: 'renewal' },
      { label: 'Update', value: 'update' }
    ]},
    { name: 'status', label: 'Status', type: 'select' as const, options: [
      { label: 'Approved', value: 'approved' },
      { label: 'Rejected', value: 'rejected' }
    ]},
    { name: 'channel', label: 'Channel', type: 'select' as const, options: [
      { label: 'Web Portal', value: 'web' },
      { label: 'Mobile App', value: 'mobile' },
      { label: 'Email', value: 'email' }
    ]},
    { name: 'officer', label: 'CRD Officer', type: 'text' as const }
  ];

  return (
    <ReportLayout
      title="Online Renewal / Update Registration Report"
      subtitle="Track online renewals and updates to insured person registrations"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'Online Renewal/Update' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Renewals" value={mockData.summary.totalRenewals.toString()} icon={FileText} variant="info" />
          <MetricCard title="Total Updates" value={mockData.summary.totalUpdates.toString()} icon={CheckCircle2} variant="info" />
          <MetricCard title="Approval Rate" value={`${mockData.summary.approvalRate}%`} icon={CheckCircle2} variant="success" />
          <MetricCard title="Avg. Processing Time" value={`${mockData.summary.avgProcessingTime} days`} icon={Clock} variant="info" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Renewals & Updates Over Time</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockData.timeline}>
                  <CartesianGrid {...CHART_STYLES.grid} />
                  <XAxis dataKey="month" {...CHART_STYLES.axis} />
                  <YAxis {...CHART_STYLES.axis} />
                  <Tooltip {...CHART_STYLES.tooltip} />
                  <Legend />
                  <Line type="monotone" dataKey="renewals" stroke={CHART_COLORS.primary} name="Renewals" strokeWidth={2} />
                  <Line type="monotone" dataKey="updates" stroke={CHART_COLORS.blue} name="Updates" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Approval vs Rejected</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={mockData.byStatus} cx="50%" cy="50%" labelLine={false} label={(entry) => `${entry.name}: ${entry.value}`} outerRadius={80} fill={CHART_COLORS.primary} dataKey="value">
                    <Cell fill={CHART_COLORS.primary} />
                    <Cell fill={CHART_COLORS.error} />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Renewals by Channel</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockData.byChannel}>
                  <CartesianGrid {...CHART_STYLES.grid} />
                  <XAxis dataKey="channel" {...CHART_STYLES.axis} />
                  <YAxis {...CHART_STYLES.axis} />
                  <Tooltip {...CHART_STYLES.tooltip} />
                  <Bar dataKey="count" fill={CHART_COLORS.blue} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      }
      tableArea={
        <Card>
          <CardHeader><CardTitle>Renewal & Update Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verified By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.details.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.personId}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.channel}</TableCell>
                    <TableCell><span className={row.status === 'Approved' ? 'text-[#009B4C] font-semibold' : 'text-[#EF4444] font-semibold'}>{row.status}</span></TableCell>
                    <TableCell>{row.verifiedBy}</TableCell>
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
