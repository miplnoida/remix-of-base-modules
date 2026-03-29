import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Clock, RotateCcw, TrendingDown } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';

interface AuditExecutiveDashboardSectionProps {
  findings: any[];
  actions: any[];
}

export function AuditExecutiveDashboardSection({ findings, actions }: AuditExecutiveDashboardSectionProps) {
  const metrics = useMemo(() => {
    const openFindings = findings.filter((f: any) => f.status !== 'Closed');
    const highRiskOpen = openFindings.filter((f: any) => f.risk_rating === 'Critical' || f.risk_rating === 'High');

    const now = new Date();
    const overdueActions = actions.filter(
      (a: any) => a.status !== 'Closed' && a.status !== 'Completed' && a.target_date && new Date(a.target_date) < now
    );
    const closedActions = actions.filter((a: any) => a.status === 'Closed' || a.status === 'Completed');
    const closureRate = actions.length > 0 ? Math.round((closedActions.length / actions.length) * 100) : 0;

    // Aging buckets for overdue actions
    const agingBuckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    overdueActions.forEach((a: any) => {
      const days = Math.floor((now.getTime() - new Date(a.target_date).getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 30) agingBuckets['0-30']++;
      else if (days <= 60) agingBuckets['31-60']++;
      else if (days <= 90) agingBuckets['61-90']++;
      else agingBuckets['90+']++;
    });

    // Repeat findings (same title or finding_code appearing multiple times)
    const titleCounts: Record<string, number> = {};
    findings.forEach((f: any) => {
      const key = (f.finding_code || f.title || '').toLowerCase().trim();
      if (key) titleCounts[key] = (titleCounts[key] || 0) + 1;
    });
    const repeatFindings = Object.values(titleCounts).filter((c) => c > 1).length;

    return {
      totalFindings: findings.length,
      openFindings: openFindings.length,
      highRiskOpen: highRiskOpen.length,
      totalActions: actions.length,
      overdueActions: overdueActions.length,
      closedActions: closedActions.length,
      closureRate,
      agingBuckets,
      repeatFindings,
    };
  }, [findings, actions]);

  const AGING_COLORS: Record<string, string> = {
    '0-30': 'bg-amber-400',
    '31-60': 'bg-orange-500',
    '61-90': 'bg-red-500',
    '90+': 'bg-red-700',
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={AlertTriangle}
          iconColor="text-destructive"
          value={metrics.highRiskOpen}
          label="High/Critical Open"
          sublabel={`of ${metrics.openFindings} total open`}
        />
        <MetricCard
          icon={Clock}
          iconColor="text-amber-600"
          value={metrics.overdueActions}
          label="Overdue Actions"
          sublabel={`of ${metrics.totalActions} total`}
        />
        <MetricCard
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          value={`${metrics.closureRate}%`}
          label="Closure Rate"
          sublabel={`${metrics.closedActions} closed`}
        />
        <MetricCard
          icon={RotateCcw}
          iconColor="text-purple-600"
          value={metrics.repeatFindings}
          label="Repeat Findings"
          sublabel="Recurring observations"
        />
      </div>

      {/* Overdue Actions Aging */}
      {metrics.overdueActions > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-sm font-semibold">Overdue Actions — Aging Analysis</span>
            </div>
            <div className="flex items-end gap-6 h-28">
              {Object.entries(metrics.agingBuckets).map(([bucket, count]) => {
                const maxCount = Math.max(...Object.values(metrics.agingBuckets), 1);
                const height = count > 0 ? Math.max((count / maxCount) * 100, 8) : 4;
                return (
                  <div key={bucket} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-xs font-bold tabular-nums">{count}</span>
                    <div
                      className={`w-full rounded-t-md ${AGING_COLORS[bucket]} transition-all`}
                      style={{ height: `${height}%`, minHeight: 4 }}
                    />
                    <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">{bucket} days</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Breakdown of Open Findings */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold mb-3">Open Findings by Risk Rating</p>
          <div className="space-y-2">
            {['Critical', 'High', 'Medium', 'Low'].map((level) => {
              const count = findings.filter(
                (f: any) => f.status !== 'Closed' && f.risk_rating === level
              ).length;
              const pct = metrics.openFindings > 0 ? Math.round((count / metrics.openFindings) * 100) : 0;
              const barColors: Record<string, string> = {
                Critical: 'bg-red-500',
                High: 'bg-orange-500',
                Medium: 'bg-amber-500',
                Low: 'bg-green-500',
              };
              return (
                <div key={level} className="flex items-center gap-3">
                  <span className="text-xs w-16 text-muted-foreground font-medium">{level}</span>
                  <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColors[level]} transition-all`}
                      style={{ width: `${pct}%`, minWidth: count > 0 ? 8 : 0 }}
                    />
                  </div>
                  <span className="text-xs font-bold tabular-nums w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  iconColor,
  value,
  label,
  sublabel,
}: {
  icon: React.ElementType;
  iconColor: string;
  value: string | number;
  label: string;
  sublabel: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className="text-2xl font-bold tabular-nums">{value}</span>
        </div>
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground">{sublabel}</p>
      </CardContent>
    </Card>
  );
}
