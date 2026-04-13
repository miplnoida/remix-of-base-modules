import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertTriangle, CheckCircle, Clock, Briefcase,
  Shield, TrendingUp, Bell, Users, Loader2
} from 'lucide-react';

interface KPIData {
  total_violations: number;
  open_violations: number;
  in_progress_violations: number;
  under_review_violations: number;
  escalated_violations: number;
  resolved_violations: number;
  closed_violations: number;
  active_cases: number;
  closed_cases: number;
  notices_responded: number;
  total_notices: number;
  avg_resolution_days: number | null;
  overdue_violations: number;
  employers_with_active_violations: number;
}

export function ComplianceKPICards() {
  const { data: kpi, isLoading } = useQuery({
    queryKey: ['ce_v_compliance_kpis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_v_compliance_kpis' as any)
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as KPIData;
    },
  });

  if (isLoading || !kpi) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const noticeResponseRate = kpi.total_notices > 0
    ? Math.round((kpi.notices_responded / kpi.total_notices) * 100)
    : 0;

  const cards = [
    { label: 'Total Violations', value: kpi.total_violations, icon: AlertTriangle, color: 'text-primary' },
    { label: 'Open', value: kpi.open_violations, icon: Clock, color: 'text-orange-600' },
    { label: 'Under Review', value: kpi.under_review_violations, icon: Shield, color: 'text-yellow-600' },
    { label: 'Escalated', value: kpi.escalated_violations, icon: TrendingUp, color: 'text-destructive' },
    { label: 'Resolved', value: kpi.resolved_violations, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Active Cases', value: kpi.active_cases, icon: Briefcase, color: 'text-blue-600' },
    { label: 'Overdue', value: kpi.overdue_violations, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Avg Resolution (days)', value: kpi.avg_resolution_days ?? '—', icon: Clock, color: 'text-muted-foreground' },
    { label: 'Employers Affected', value: kpi.employers_with_active_violations, icon: Users, color: 'text-primary' },
    { label: 'Notice Response Rate', value: `${noticeResponseRate}%`, icon: Bell, color: 'text-green-600' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
            <c.icon className={`h-4 w-4 ${c.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{c.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
