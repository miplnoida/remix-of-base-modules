import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, CheckCircle2, Send } from 'lucide-react';
import { CHART_COLORS, CHART_STYLES } from '@/lib/chartColors';

const mockData = {
  summary: { totalReceived: 234, totalSubmitted: 189, pending: 45 },
  timeline: [
    { month: 'Jan', received: 45, submitted: 38 },
    { month: 'Feb', received: 52, submitted: 48 },
    { month: 'Mar', received: 48, submitted: 42 },
    { month: 'Apr', received: 51, submitted: 35 },
    { month: 'May', received: 38, submitted: 26 }
  ],
  details: [
    { claimId: 'CLM-001', receivedAtCRD: '2024-05-10', submittedToBenefits: '2024-05-12', status: 'Submitted' },
    { claimId: 'CLM-002', receivedAtCRD: '2024-05-11', submittedToBenefits: null, status: 'Pending' }
  ]
};

export default function ClaimsToBenefitsReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  return (
    <ReportLayout
      title="Claims Submitted to Benefits Department"
      breadcrumbs={[{ label: 'Insured Persons', href: '/person/management' }, { label: 'Reports' }, { label: 'Claims to Benefits' }]}
      filterPanel={<QueryByFilter fields={[{ name: 'dateRange', label: 'Date Range', type: 'daterange' as const }]} onFilter={setFilters} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Received at CRD" value={mockData.summary.totalReceived.toString()} icon={FileText} variant="info" />
          <MetricCard title="Submitted to Benefits" value={mockData.summary.totalSubmitted.toString()} icon={Send} variant="success" />
          <MetricCard title="Pending" value={mockData.summary.pending.toString()} icon={CheckCircle2} variant="warning" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader><CardTitle>Claims Flow</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockData.timeline}>
                <CartesianGrid {...CHART_STYLES.grid} />
                <XAxis dataKey="month" {...CHART_STYLES.axis} />
                <YAxis {...CHART_STYLES.axis} />
                <Tooltip {...CHART_STYLES.tooltip} />
                <Bar dataKey="received" fill={CHART_COLORS.blue} name="Received" />
                <Bar dataKey="submitted" fill={CHART_COLORS.primary} name="Submitted" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader><CardTitle>Claim Handoff Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim ID</TableHead>
                  <TableHead>Received at CRD</TableHead>
                  <TableHead>Submitted to Benefits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.details.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.claimId}</TableCell>
                    <TableCell>{row.receivedAtCRD}</TableCell>
                    <TableCell>{row.submittedToBenefits || '-'}</TableCell>
                    <TableCell><span className={row.status === 'Submitted' ? 'text-[#009B4C] font-semibold' : 'text-[#F59E0B] font-semibold'}>{row.status}</span></TableCell>
                    <TableCell>
                      {row.status === 'Pending' && <Button size="sm" variant="outline">Submit to Benefits</Button>}
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
