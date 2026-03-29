import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, CheckCircle2, Clock, AlertTriangle, Target } from 'lucide-react';

interface AuditPortfolioSectionProps {
  engagements: any[];
  departments: any[];
}

export function AuditPortfolioSection({ engagements, departments }: AuditPortfolioSectionProps) {
  const stats = useMemo(() => {
    const total = engagements.length;
    const completed = engagements.filter((e: any) =>
      ['Closed', 'Final Report Issued'].includes(e.execution_status || e.status)
    ).length;
    const inProgress = engagements.filter((e: any) =>
      ['Fieldwork In Progress', 'Findings Drafting', 'Management Response Pending'].includes(e.execution_status || '')
    ).length;
    const notStarted = engagements.filter((e: any) =>
      ['Planned', 'Ready for Launch'].includes(e.execution_status || e.status || '')
    ).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, notStarted, completionRate };
  }, [engagements]);

  const riskDistribution = useMemo(() => {
    const counts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    engagements.forEach((e: any) => {
      const risk = e.risk_rating || e.inherent_risk_level || 'Medium';
      if (counts[risk] !== undefined) counts[risk]++;
    });
    return counts;
  }, [engagements]);

  const deptCoverage = useMemo(() => {
    const deptMap: Record<string, { name: string; planned: number; completed: number }> = {};
    departments.forEach((d: any) => {
      deptMap[d.id] = { name: d.name, planned: 0, completed: 0 };
    });
    engagements.forEach((e: any) => {
      if (e.department_id && deptMap[e.department_id]) {
        deptMap[e.department_id].planned++;
        if (['Closed', 'Final Report Issued'].includes(e.execution_status || e.status || '')) {
          deptMap[e.department_id].completed++;
        }
      }
    });
    return Object.values(deptMap).filter((d) => d.planned > 0).sort((a, b) => b.planned - a.planned);
  }, [engagements, departments]);

  const RISK_COLORS: Record<string, string> = {
    Critical: 'bg-red-500',
    High: 'bg-orange-500',
    Medium: 'bg-amber-500',
    Low: 'bg-green-500',
  };

  return (
    <div className="space-y-6">
      {/* Plan Progress Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Planned', value: stats.total, icon: Target, color: 'text-primary' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'text-blue-600' },
          { label: 'Not Started', value: stats.notStarted, icon: AlertTriangle, color: 'text-amber-600' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-2xl font-bold tabular-nums">{s.value}</span>
              </div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Completion Rate */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Plan Completion Rate</span>
            </div>
            <span className="text-lg font-bold text-primary">{stats.completionRate}%</span>
          </div>
          <Progress value={stats.completionRate} className="h-2.5" />
        </CardContent>
      </Card>

      {/* Risk Distribution */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold mb-4">Engagement Risk Distribution</p>
          <div className="flex items-end gap-4 h-32">
            {Object.entries(riskDistribution).map(([level, count]) => {
              const maxCount = Math.max(...Object.values(riskDistribution), 1);
              const height = count > 0 ? Math.max((count / maxCount) * 100, 8) : 4;
              return (
                <div key={level} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-xs font-bold tabular-nums">{count}</span>
                  <div
                    className={`w-full rounded-t-md ${RISK_COLORS[level]} transition-all`}
                    style={{ height: `${height}%`, minHeight: 4 }}
                  />
                  <span className="text-[10px] text-muted-foreground font-medium">{level}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Department Coverage */}
      {deptCoverage.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-semibold mb-3">Department Coverage</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left p-2 font-medium">Department</th>
                    <th className="text-center p-2 font-medium">Planned</th>
                    <th className="text-center p-2 font-medium">Completed</th>
                    <th className="text-center p-2 font-medium">Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {deptCoverage.map((d) => {
                    const pct = d.planned > 0 ? Math.round((d.completed / d.planned) * 100) : 0;
                    return (
                      <tr key={d.name} className="border-b last:border-0">
                        <td className="p-2 font-medium">{d.name}</td>
                        <td className="p-2 text-center">{d.planned}</td>
                        <td className="p-2 text-center">{d.completed}</td>
                        <td className="p-2 text-center">
                          <Badge variant={pct === 100 ? 'default' : 'outline'} className="text-xs">
                            {pct}%
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
