import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Phone, AlertCircle, Loader2, Inbox } from 'lucide-react';
import { CHART_COLORS } from '@/lib/chartColors';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PIE_COLORS = [CHART_COLORS.primary, CHART_COLORS.blue, CHART_COLORS.teal, CHART_COLORS.gold];

async function fetchCRMData() {
  const { data, error } = await supabase
    .from('crm_interactions')
    .select('*')
    .order('interaction_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export default function CRMActivityReport() {
  const { data: interactions = [], isLoading } = useQuery({
    queryKey: ['crm-interactions'],
    queryFn: fetchCRMData,
  });

  const totalInteractions = interactions.length;
  const complaints = interactions.filter(i => i.interaction_type === 'Complaint').length;
  const complaintRate = totalInteractions > 0 ? ((complaints / totalInteractions) * 100).toFixed(1) : '0';
  const resolved = interactions.filter(i => i.resolution_time_days != null);
  const avgResolution = resolved.length > 0
    ? (resolved.reduce((s, i) => s + Number(i.resolution_time_days), 0) / resolved.length).toFixed(1)
    : '0';

  const byType = Object.entries(
    interactions.reduce<Record<string, number>>((acc, i) => {
      acc[i.interaction_type] = (acc[i.interaction_type] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ReportLayout
      title="Customer Relationship Module Activity"
      breadcrumbs={[{ label: 'Insured Persons', href: '/person/management' }, { label: 'Reports' }, { label: 'CRM Activity' }]}
      filterPanel={<QueryByFilter fields={[{ name: 'dateRange', label: 'Date Range', type: 'daterange' as const }]} onFilter={() => {}} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Total Interactions" value={totalInteractions.toString()} icon={Activity} variant="info" />
          <MetricCard title="Complaint Rate" value={`${complaintRate}%`} icon={AlertCircle} variant="warning" />
          <MetricCard title="Avg. Resolution Time" value={`${avgResolution} days`} icon={Phone} variant="info" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader><CardTitle>Interactions by Type</CardTitle></CardHeader>
          <CardContent>
            {byType.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <Inbox className="h-10 w-10 mb-2" />
                <p>No interaction data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={byType} cx="50%" cy="50%" labelLine={false} label={(entry) => `${entry.name}: ${entry.value}`} outerRadius={80} dataKey="value">
                    {byType.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader><CardTitle>Interaction Details</CardTitle></CardHeader>
          <CardContent>
            {interactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Inbox className="h-10 w-10 mb-2" />
                <p>No interactions recorded</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Officer</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interactions.slice(0, 20).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.interaction_type}</TableCell>
                      <TableCell>{row.officer || '-'}</TableCell>
                      <TableCell>
                        <span className={row.outcome === 'Resolved' ? 'text-success font-semibold' : row.outcome === 'Escalated' ? 'text-destructive font-semibold' : 'text-warning font-semibold'}>
                          {row.outcome || '-'}
                        </span>
                      </TableCell>
                      <TableCell>{row.interaction_date}</TableCell>
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
