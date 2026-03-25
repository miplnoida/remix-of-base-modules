import { useState, useMemo } from 'react';
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/shared/MetricCard";
import { QueryByFilter } from "@/components/shared/QueryByFilter";
import { ExportActions } from '@/components/reports/ExportActions';
import { ExportColumn } from '@/utils/exportUtils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertTriangle, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDateForDisplay } from '@/lib/format-config';
import { differenceInDays, parseISO } from 'date-fns';

const exportColumns: ExportColumn[] = [
  { header: 'Action', key: 'action_description', width: 35 },
  { header: 'Assigned To', key: 'assigned_to_name', width: 20 },
  { header: 'Status', key: 'status', width: 15 },
  { header: 'Priority', key: 'priority', width: 12 },
  { header: 'Due Date', key: 'due_date', width: 18 },
  { header: 'Days Overdue', key: 'days_overdue', width: 15 },
  { header: 'Finding', key: 'finding_title', width: 25 },
];

const PRIORITY_COLORS: Record<string, string> = {
  Critical: 'bg-red-100 text-red-800 border-red-300',
  High: 'bg-orange-100 text-orange-800 border-orange-300',
  Medium: 'bg-amber-100 text-amber-800 border-amber-300',
  Low: 'bg-muted text-muted-foreground',
};

export default function OverdueActionsReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['ia_overdue_actions_report', filters],
    queryFn: async () => {
      let query = supabase
        .from('ia_action_tracking' as any)
        .select('*, finding:finding_id(title)')
        .order('due_date', { ascending: true });

      if (filters.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      const { data, error } = await query.limit(500);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const enriched = useMemo(() => {
    const now = new Date();
    return actions.map((a: any) => {
      const daysOverdue = a.due_date ? differenceInDays(now, parseISO(a.due_date)) : 0;
      return {
        ...a,
        action_description: a.action_title || a.description || 'Untitled action',
        assigned_to_name: a.assigned_to_name || a.assigned_to || '—',
        finding_title: a.finding?.title || '—',
        days_overdue: a.status !== 'Completed' && daysOverdue > 0 ? daysOverdue : 0,
        is_overdue: a.status !== 'Completed' && daysOverdue > 0,
      };
    });
  }, [actions]);

  const overdueItems = enriched.filter((a: any) => a.is_overdue);
  const completedItems = enriched.filter((a: any) => a.status === 'Completed');
  const criticalOverdue = overdueItems.filter((a: any) => a.priority === 'Critical' || a.priority === 'High');

  // Aging chart
  const agingData = useMemo(() => {
    const buckets = [
      { name: '1-7 days', value: 0, color: 'hsl(var(--warning))' },
      { name: '8-30 days', value: 0, color: 'hsl(var(--destructive) / 0.6)' },
      { name: '31-90 days', value: 0, color: 'hsl(var(--destructive) / 0.8)' },
      { name: '90+ days', value: 0, color: 'hsl(var(--destructive))' },
    ];
    overdueItems.forEach((a: any) => {
      if (a.days_overdue <= 7) buckets[0].value++;
      else if (a.days_overdue <= 30) buckets[1].value++;
      else if (a.days_overdue <= 90) buckets[2].value++;
      else buckets[3].value++;
    });
    return buckets.filter(b => b.value > 0);
  }, [overdueItems]);

  const filterFields = [
    { name: 'priority', label: 'Priority', type: 'select' as const, options: [
      { label: 'All', value: 'all' },
      { label: 'Critical', value: 'Critical' },
      { label: 'High', value: 'High' },
      { label: 'Medium', value: 'Medium' },
      { label: 'Low', value: 'Low' },
    ]},
    { name: 'status', label: 'Status', type: 'select' as const, options: [
      { label: 'All', value: 'all' },
      { label: 'Open', value: 'Open' },
      { label: 'In Progress', value: 'In Progress' },
      { label: 'Completed', value: 'Completed' },
      { label: 'Overdue', value: 'Overdue' },
    ]},
  ];

  return (
    <div className="container mx-auto p-6 space-y-6" id="overdue-actions-report">
      <div className="flex justify-between items-start">
        <PageHeader
          title="Overdue Actions & Aging"
          subtitle="Track overdue audit actions with aging analysis"
          breadcrumbs={[
            { label: "Internal Audit", href: "/audit/dashboard" },
            { label: "Reports" },
            { label: "Overdue Actions" },
          ]}
        />
        <ExportActions
          reportTitle="Overdue Actions Report"
          fileName="overdue-actions"
          data={enriched}
          columns={exportColumns}
          additionalInfo={[
            { label: 'Report Date', value: new Date().toLocaleDateString() },
            { label: 'Total Overdue', value: String(overdueItems.length) },
          ]}
        />
      </div>

      <div className="no-print">
        <QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Total Actions" value={String(enriched.length)} icon={Clock} variant="info" />
        <MetricCard title="Overdue" value={String(overdueItems.length)} icon={AlertTriangle} variant="warning" />
        <MetricCard title="Critical/High Overdue" value={String(criticalOverdue.length)} icon={ShieldAlert} variant="error" />
        <MetricCard title="Completed" value={String(completedItems.length)} icon={CheckCircle2} variant="success" />
      </div>

      {agingData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Overdue Aging Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={agingData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {agingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Action Details</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Finding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enriched.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No actions found</TableCell></TableRow>
                ) : enriched.map((row: any) => (
                  <TableRow key={row.id} className={row.is_overdue ? 'bg-destructive/5' : ''}>
                    <TableCell className="font-medium text-sm max-w-[250px] truncate">{row.action_description}</TableCell>
                    <TableCell className="text-xs">{row.assigned_to_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{row.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${PRIORITY_COLORS[row.priority] || 'bg-muted text-muted-foreground'}`}>
                        {row.priority || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{row.due_date ? formatDateForDisplay(row.due_date) : '—'}</TableCell>
                    <TableCell>
                      {row.is_overdue ? (
                        <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px]">
                          {row.days_overdue}d overdue
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate">{row.finding_title}</TableCell>
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
