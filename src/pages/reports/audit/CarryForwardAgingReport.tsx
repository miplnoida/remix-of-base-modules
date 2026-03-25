import { useState, useMemo } from 'react';
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/shared/MetricCard";
import { QueryByFilter } from "@/components/shared/QueryByFilter";
import { ExportActions } from '@/components/reports/ExportActions';
import { ExportColumn } from '@/utils/exportUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { History, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDateForDisplay } from '@/lib/format-config';
import { differenceInDays, parseISO } from 'date-fns';

const exportColumns: ExportColumn[] = [
  { header: 'Finding', key: 'finding_title', width: 30 },
  { header: 'Source Year', key: 'source_fiscal_year', width: 15 },
  { header: 'Target Year', key: 'target_fiscal_year', width: 15 },
  { header: 'Status', key: 'status', width: 15 },
  { header: 'Risk Rating', key: 'original_risk_rating', width: 15 },
  { header: 'Target Date', key: 'target_completion_date', width: 18 },
  { header: 'Aging (days)', key: 'aging_days', width: 15 },
  { header: 'Escalation Level', key: 'escalation_level', width: 15 },
];

export default function CarryForwardAgingReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const { data: carryForwards = [], isLoading } = useQuery({
    queryKey: ['ia_carry_forward_aging_report', filters],
    queryFn: async () => {
      let query = supabase
        .from('ia_plan_carry_forward' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.risk && filters.risk !== 'all') {
        query = query.eq('original_risk_rating', filters.risk);
      }
      const { data, error } = await query.limit(500);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const enriched = useMemo(() => {
    const now = new Date();
    return carryForwards.map((cf: any) => {
      const agingDays = cf.target_completion_date
        ? Math.max(0, differenceInDays(now, parseISO(cf.target_completion_date)))
        : differenceInDays(now, parseISO(cf.created_at));
      return {
        ...cf,
        finding_title: cf.finding_title || cf.original_finding_id?.substring(0, 8) || '—',
        aging_days: cf.status === 'Resolved' || cf.status === 'Closed' ? 0 : agingDays,
        is_overdue: cf.status !== 'Resolved' && cf.status !== 'Closed' && cf.target_completion_date && differenceInDays(now, parseISO(cf.target_completion_date)) > 0,
      };
    });
  }, [carryForwards]);

  const openItems = enriched.filter((cf: any) => cf.status !== 'Resolved' && cf.status !== 'Closed');
  const overdueItems = enriched.filter((cf: any) => cf.is_overdue);
  const escalatedItems = enriched.filter((cf: any) => (cf.escalation_level || 0) > 0);
  const resolvedItems = enriched.filter((cf: any) => cf.status === 'Resolved' || cf.status === 'Closed');

  // Chart: aging buckets by risk rating
  const chartData = useMemo(() => {
    const ratings = ['Critical', 'High', 'Medium', 'Low'];
    return ratings.map(rating => {
      const items = openItems.filter((cf: any) => cf.original_risk_rating === rating);
      return {
        name: rating,
        '0-30 days': items.filter((cf: any) => cf.aging_days <= 30).length,
        '31-90 days': items.filter((cf: any) => cf.aging_days > 30 && cf.aging_days <= 90).length,
        '90+ days': items.filter((cf: any) => cf.aging_days > 90).length,
      };
    }).filter(d => d['0-30 days'] + d['31-90 days'] + d['90+ days'] > 0);
  }, [openItems]);

  const filterFields = [
    { name: 'status', label: 'Status', type: 'select' as const, options: [
      { label: 'All', value: 'all' },
      { label: 'Open', value: 'Open' },
      { label: 'In Progress', value: 'In Progress' },
      { label: 'Resolved', value: 'Resolved' },
      { label: 'Escalated', value: 'Escalated' },
    ]},
    { name: 'risk', label: 'Risk Rating', type: 'select' as const, options: [
      { label: 'All', value: 'all' },
      { label: 'Critical', value: 'Critical' },
      { label: 'High', value: 'High' },
      { label: 'Medium', value: 'Medium' },
      { label: 'Low', value: 'Low' },
    ]},
  ];

  return (
    <div className="container mx-auto p-6 space-y-6" id="carry-forward-aging-report">
      <div className="flex justify-between items-start">
        <PageHeader
          title="Carry-Forward Aging"
          subtitle="Prior audit findings carry-forward tracking and aging analysis"
          breadcrumbs={[
            { label: "Internal Audit", href: "/audit/dashboard" },
            { label: "Reports" },
            { label: "Carry-Forward Aging" },
          ]}
        />
        <ExportActions
          reportTitle="Carry-Forward Aging Report"
          fileName="carry-forward-aging"
          data={enriched}
          columns={exportColumns}
          additionalInfo={[
            { label: 'Report Date', value: new Date().toLocaleDateString() },
            { label: 'Open Items', value: String(openItems.length) },
            { label: 'Overdue Items', value: String(overdueItems.length) },
          ]}
        />
      </div>

      <div className="no-print">
        <QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Open Items" value={String(openItems.length)} icon={History} variant="info" />
        <MetricCard title="Overdue" value={String(overdueItems.length)} icon={AlertTriangle} variant="warning" />
        <MetricCard title="Escalated" value={String(escalatedItems.length)} icon={TrendingUp} variant="destructive" />
        <MetricCard title="Resolved" value={String(resolvedItems.length)} icon={CheckCircle2} variant="success" />
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Aging by Risk Rating</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="0-30 days" stackId="a" fill="hsl(var(--warning))" />
                <Bar dataKey="31-90 days" stackId="a" fill="hsl(var(--destructive) / 0.7)" />
                <Bar dataKey="90+ days" stackId="a" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Carry-Forward Details</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Finding</TableHead>
                  <TableHead>Source Year</TableHead>
                  <TableHead>Target Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Target Date</TableHead>
                  <TableHead>Aging</TableHead>
                  <TableHead>Escalation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enriched.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No carry-forward items found</TableCell></TableRow>
                ) : enriched.map((row: any) => (
                  <TableRow key={row.id} className={row.is_overdue ? 'bg-destructive/5' : ''}>
                    <TableCell className="font-medium text-sm max-w-[200px] truncate">{row.finding_title}</TableCell>
                    <TableCell className="text-xs">{row.source_fiscal_year || '—'}</TableCell>
                    <TableCell className="text-xs">{row.target_fiscal_year || '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{row.status}</Badge></TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${
                        row.original_risk_rating === 'Critical' ? 'bg-red-100 text-red-800 border-red-300' :
                        row.original_risk_rating === 'High' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                        row.original_risk_rating === 'Medium' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {row.original_risk_rating || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{row.target_completion_date ? formatDateForDisplay(row.target_completion_date) : '—'}</TableCell>
                    <TableCell>
                      {row.aging_days > 0 ? (
                        <Badge className={`text-[10px] ${
                          row.aging_days > 90 ? 'bg-red-100 text-red-800 border-red-300' :
                          row.aging_days > 30 ? 'bg-orange-100 text-orange-800 border-orange-300' :
                          'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {row.aging_days}d
                        </Badge>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {(row.escalation_level || 0) > 0 ? (
                        <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px]">Level {row.escalation_level}</Badge>
                      ) : <span className="text-xs text-muted-foreground">None</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
