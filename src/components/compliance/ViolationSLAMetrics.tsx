import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, UserCheck, Play, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ViolationSLAMetricsProps {
  violationId: string;
  createdAt: string;
  assignedAt?: string | null;
  dueDate?: string | null;
  status: string;
}

function diffLabel(ms: number): string {
  if (ms < 0) return '—';
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  return `${hours}h`;
}

export function ViolationSLAMetrics({ violationId, createdAt, assignedAt, dueDate, status }: ViolationSLAMetricsProps) {
  const { data: firstAction } = useQuery({
    queryKey: ['ce_violation_sla_first_action', violationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ce_violation_history')
        .select('performed_at')
        .eq('violation_id', violationId)
        .order('performed_at', { ascending: true })
        .limit(1);
      return data?.[0]?.performed_at || null;
    },
    enabled: !!violationId,
  });

  const { data: lastTransition } = useQuery({
    queryKey: ['ce_violation_sla_last_transition', violationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ce_violation_history')
        .select('performed_at, to_value')
        .eq('violation_id', violationId)
        .order('performed_at', { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!violationId,
  });

  const now = Date.now();
  const created = new Date(createdAt).getTime();

  const timeToAssign = assignedAt ? new Date(assignedAt).getTime() - created : -1;
  const timeToFirstAction = firstAction ? new Date(firstAction).getTime() - created : -1;

  const lastStatusChange = lastTransition?.performed_at
    ? now - new Date(lastTransition.performed_at).getTime()
    : now - created;

  const isOverdue = dueDate && new Date(dueDate).getTime() < now && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(status);
  const overdueAge = isOverdue ? now - new Date(dueDate!).getTime() : -1;

  const metrics = [
    {
      label: 'Time to Assignment',
      value: timeToAssign >= 0 ? diffLabel(timeToAssign) : 'Not assigned',
      icon: UserCheck,
      alert: timeToAssign > 172800000, // >2 days
    },
    {
      label: 'Time to First Action',
      value: timeToFirstAction >= 0 ? diffLabel(timeToFirstAction) : 'No action yet',
      icon: Play,
      alert: timeToFirstAction > 259200000, // >3 days
    },
    {
      label: 'Age in Current Status',
      value: diffLabel(lastStatusChange),
      icon: Clock,
      alert: lastStatusChange > 604800000, // >7 days
    },
    {
      label: 'Overdue By',
      value: isOverdue ? diffLabel(overdueAge) : 'On track',
      icon: AlertTriangle,
      alert: !!isOverdue,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          SLA Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <div key={m.label} className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <m.icon className="h-3 w-3" />
                {m.label}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${m.alert ? 'text-destructive' : 'text-foreground'}`}>
                  {m.value}
                </span>
                {m.alert && <Badge variant="destructive" className="text-[10px] h-4">SLA</Badge>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
