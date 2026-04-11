import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, CheckCircle2, Send, Loader2, Inbox } from 'lucide-react';
import { CHART_COLORS, CHART_STYLES } from '@/lib/chartColors';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

async function fetchClaimsToBenefits() {
  const { data, error } = await supabase
    .from('claims_to_benefits')
    .select('*')
    .order('received_at_crd', { ascending: false });
  if (error) throw error;
  return data || [];
}

export default function ClaimsToBenefitsReport() {
  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['claims-to-benefits'],
    queryFn: fetchClaimsToBenefits,
  });

  const totalReceived = claims.length;
  const totalSubmitted = claims.filter(c => c.status === 'Submitted').length;
  const pending = claims.filter(c => c.status === 'Pending').length;

  // Build monthly timeline from data
  const timeline = Object.entries(
    claims.reduce<Record<string, { received: number; submitted: number }>>((acc, c) => {
      const month = c.received_at_crd?.substring(0, 7) || 'Unknown';
      if (!acc[month]) acc[month] = { received: 0, submitted: 0 };
      acc[month].received++;
      if (c.status === 'Submitted') acc[month].submitted++;
      return acc;
    }, {})
  ).map(([month, vals]) => ({ month, ...vals })).sort((a, b) => a.month.localeCompare(b.month));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ReportLayout
      title="Claims Submitted to Benefits Department"
      breadcrumbs={[{ label: 'Insured Persons', href: '/person/management' }, { label: 'Reports' }, { label: 'Claims to Benefits' }]}
      filterPanel={<QueryByFilter fields={[{ name: 'dateRange', label: 'Date Range', type: 'daterange' as const }]} onFilter={() => {}} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Received at CRD" value={totalReceived.toString()} icon={FileText} variant="info" />
          <MetricCard title="Submitted to Benefits" value={totalSubmitted.toString()} icon={Send} variant="success" />
          <MetricCard title="Pending" value={pending.toString()} icon={CheckCircle2} variant="warning" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader><CardTitle>Claims Flow</CardTitle></CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <Inbox className="h-10 w-10 mb-2" /><p>No data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timeline}>
                  <CartesianGrid {...CHART_STYLES.grid} />
                  <XAxis dataKey="month" {...CHART_STYLES.axis} />
                  <YAxis {...CHART_STYLES.axis} />
                  <Tooltip {...CHART_STYLES.tooltip} />
                  <Bar dataKey="received" fill={CHART_COLORS.blue} name="Received" />
                  <Bar dataKey="submitted" fill={CHART_COLORS.primary} name="Submitted" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader><CardTitle>Claim Handoff Details</CardTitle></CardHeader>
          <CardContent>
            {claims.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Inbox className="h-10 w-10 mb-2" /><p>No claims recorded</p>
              </div>
            ) : (
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
                  {claims.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.claim_id}</TableCell>
                      <TableCell>{row.received_at_crd}</TableCell>
                      <TableCell>{row.submitted_to_benefits || '-'}</TableCell>
                      <TableCell>
                        <span className={row.status === 'Submitted' ? 'text-[#009B4C] font-semibold' : 'text-[#F59E0B] font-semibold'}>
                          {row.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {row.status === 'Pending' && <Button size="sm" variant="outline">Submit to Benefits</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      }
      onExportCSV={() => console.log('Export CSV')}
      onExportPDF={() => console.log('Export PDF')}
    />
  );
}
