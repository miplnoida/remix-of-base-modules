import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar, Users, Clock, BarChart3, CheckCircle2, Info, TrendingUp, Shield } from 'lucide-react';
import { useIAPlanEngagements } from '@/hooks/useAuditPlanChangeLog';
import { useIAActiveAuditors } from '@/hooks/useAuditData';
import { DataTable, StatusBadge } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { formatDateForDisplay } from '@/lib/format-config';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  analyzeDistribution,
  configFromPlan,
  calculateCapacity,
  getEngagementHours,
  type CapacityConfig,
  type QuarterAnalysis,
  type CapacityWarning,
} from '@/lib/audit/capacityPlanner';

interface CapacityCalendarPanelProps {
  planId: string;
  plan?: any;
}

const QUARTER_STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  overloaded: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/30' },
  heavy: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700' },
  balanced: { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-300 dark:border-green-700' },
  underloaded: { bg: 'bg-muted/30', text: 'text-muted-foreground', border: 'border-border' },
};

export function CapacityCalendarPanel({ planId, plan }: CapacityCalendarPanelProps) {
  const { data: engagements = [] } = useIAPlanEngagements(planId);
  const { data: auditors = [] } = useIAActiveAuditors();

  const getAuditorName = (id: string) => (auditors || []).find((a: any) => a.id === id)?.name || '—';

  const capacityConfig = useMemo(() => configFromPlan(plan, auditors.length), [plan, auditors.length]);
  const hasCapacityConfig = capacityConfig.auditorCount > 0;
  const capacitySummary = useMemo(() => hasCapacityConfig ? calculateCapacity(capacityConfig) : null, [capacityConfig, hasCapacityConfig]);
  const distribution = useMemo(() => hasCapacityConfig ? analyzeDistribution(capacityConfig, engagements) : null, [capacityConfig, engagements, hasCapacityConfig]);

  // Resource-centric view
  const resourceData = useMemo(() => {
    const map = new Map<string, { name: string; role: string; engagements: any[]; totalDays: number; totalHours: number; quarters: Set<string> }>();
    
    engagements.forEach((e: any) => {
      const days = Number(e.estimated_days) || 0;
      const hours = getEngagementHours(e);
      const quarter = e.quarter || '';
      
      if (e.lead_auditor_id) {
        const auditor = (auditors || []).find((a: any) => a.id === e.lead_auditor_id);
        const existing = map.get(e.lead_auditor_id) || { name: auditor?.name || '—', role: 'Lead', engagements: [], totalDays: 0, totalHours: 0, quarters: new Set<string>() };
        existing.engagements.push({ ...e, assignmentRole: 'Lead' });
        existing.totalDays += days;
        existing.totalHours += hours;
        if (quarter) existing.quarters.add(quarter);
        map.set(e.lead_auditor_id, existing);
      }
      
      const supportIds = Array.isArray(e.supportive_auditor_ids) ? e.supportive_auditor_ids : [];
      supportIds.forEach((sid: string) => {
        const auditor = (auditors || []).find((a: any) => a.id === sid);
        const existing = map.get(sid) || { name: auditor?.name || '—', role: 'Support', engagements: [], totalDays: 0, totalHours: 0, quarters: new Set<string>() };
        existing.engagements.push({ ...e, assignmentRole: 'Support' });
        existing.totalDays += Math.round(days * 0.5);
        existing.totalHours += Math.round(hours * 0.5);
        if (quarter) existing.quarters.add(quarter);
        map.set(sid, existing);
      });
    });
    
    return Array.from(map.entries()).map(([id, data]) => ({
      id,
      ...data,
      quartersStr: Array.from(data.quarters).sort().join(', '),
    })).sort((a, b) => b.totalHours - a.totalHours);
  }, [engagements, auditors]);

  // Detect schedule conflicts
  const conflicts = useMemo(() => {
    const issues: { auditorName: string; eng1: string; eng2: string; type: string }[] = [];
    resourceData.forEach((resource) => {
      const dated = resource.engagements.filter((e: any) => e.planned_start_date && e.planned_end_date);
      for (let i = 0; i < dated.length; i++) {
        for (let j = i + 1; j < dated.length; j++) {
          const a = dated[i], b = dated[j];
          if (a.planned_start_date <= b.planned_end_date && b.planned_start_date <= a.planned_end_date) {
            issues.push({ auditorName: resource.name, eng1: a.engagement_name, eng2: b.engagement_name, type: 'Date Overlap' });
          }
        }
      }
    });
    return issues;
  }, [resourceData]);

  const totalDays = engagements.reduce((s: number, e: any) => s + (Number(e.estimated_days) || 0), 0);
  const totalHours = engagements.reduce((s: number, e: any) => s + getEngagementHours(e), 0);

  const getUtilColor = (pct: number) => {
    if (pct > 100) return '[&>div]:bg-destructive';
    if (pct > 90) return '[&>div]:bg-amber-500';
    if (pct >= 60) return '[&>div]:bg-green-500';
    return '[&>div]:bg-muted-foreground';
  };

  const resourceColumns: DataTableColumn<any>[] = [
    { key: 'name', header: 'Auditor', render: (r) => (
      <div>
        <p className="text-sm font-medium">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.engagements.length} engagement(s)</p>
      </div>
    )},
    { key: 'totalHours', header: 'Hours', render: (r) => <span className="font-semibold text-sm">{r.totalHours}h</span> },
    { key: 'totalDays', header: 'Days', render: (r) => <span className="text-sm">{r.totalDays}d</span> },
    { key: 'quartersStr', header: 'Active Quarters' },
    { key: 'workload', header: 'Workload', render: (r) => {
      const level = r.engagements.length > 5 ? 'Overloaded' : r.engagements.length > 3 ? 'High' : 'Normal';
      return <Badge variant={level === 'Overloaded' ? 'destructive' : level === 'High' ? 'secondary' : 'default'}>{level}</Badge>;
    }},
    { key: 'assignments', header: 'Engagements', render: (r) => (
      <div className="space-y-0.5">
        {r.engagements.slice(0, 3).map((e: any, i: number) => (
          <div key={i} className="text-xs">
            <span className={e.assignmentRole === 'Lead' ? 'font-medium' : 'text-muted-foreground'}>
              {e.assignmentRole === 'Lead' ? '●' : '○'} {e.engagement_name}
            </span>
            <span className="text-muted-foreground ml-1">({e.quarter || '—'})</span>
          </div>
        ))}
        {r.engagements.length > 3 && (
          <span className="text-xs text-muted-foreground">+{r.engagements.length - 3} more</span>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <Tabs defaultValue="capacity" className="w-full">
        <TabsList>
          <TabsTrigger value="capacity">Quarter Capacity</TabsTrigger>
          <TabsTrigger value="resources">Resource Allocation</TabsTrigger>
          <TabsTrigger value="timeline">Audit Timeline</TabsTrigger>
        </TabsList>

        {/* ─── Quarter Capacity Tab ─── */}
        <TabsContent value="capacity" className="space-y-4">
          {!hasCapacityConfig && (
            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="flex items-center gap-3 pt-6">
                <Info className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-300">
                  <p className="font-medium">Capacity Not Configured</p>
                  <p>Edit the plan and set the <strong>Team Capacity</strong> (auditor count, monthly hours, utilization %) to enable effort-based capacity analysis.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Overall Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Engagements</p>
                    <p className="text-lg font-semibold">{engagements.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Planned Hours</p>
                    <p className="text-lg font-semibold">{totalHours.toLocaleString()}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            {hasCapacityConfig && capacitySummary && (
              <>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Net Capacity</p>
                        <p className="text-lg font-semibold">{capacitySummary.annualNetHours.toLocaleString()}h</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className={`h-4 w-4 ${distribution && distribution.overallUtilization > 100 ? 'text-destructive' : 'text-green-600'}`} />
                      <div>
                        <p className="text-xs text-muted-foreground">Overall Utilization</p>
                        <p className={`text-lg font-semibold ${distribution && distribution.overallUtilization > 100 ? 'text-destructive' : ''}`}>
                          {distribution?.overallUtilization || 0}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2">
                      {distribution?.isBalanced 
                        ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                        : <AlertTriangle className="h-4 w-4 text-amber-600" />
                      }
                      <div>
                        <p className="text-xs text-muted-foreground">Balance Score</p>
                        <p className="text-lg font-semibold">{distribution?.balanceScore || 0}/100</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Quarter Cards with Capacity Bars */}
          {hasCapacityConfig && distribution && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {distribution.quarters.map(q => {
                const styles = QUARTER_STATUS_STYLES[q.status];
                return (
                  <Card key={q.quarter} className={`${styles.border} border`}>
                    <CardContent className="pt-4 pb-3 px-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-foreground">{q.quarter}</span>
                        <Badge 
                          variant={q.status === 'overloaded' ? 'destructive' : q.status === 'balanced' ? 'default' : 'secondary'}
                          className="text-xs capitalize"
                        >
                          {q.status}
                        </Badge>
                      </div>
                      
                      <Progress 
                        value={Math.min(q.utilizationPct, 100)} 
                        className={`h-2.5 mb-2 ${getUtilColor(q.utilizationPct)}`} 
                      />
                      
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Used / Capacity</span>
                          <span className={`font-medium ${styles.text}`}>{q.used}h / {q.capacity}h</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Remaining</span>
                          <span className={`font-medium ${q.remaining < 0 ? 'text-destructive' : 'text-foreground'}`}>
                            {q.remaining}h
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Utilization</span>
                          <span className={`font-semibold ${styles.text}`}>{q.utilizationPct}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Engagements</span>
                          <span>{q.engagementCount}</span>
                        </div>
                        {q.highRiskCount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">High/Critical Risk</span>
                            <span className="text-amber-600 font-medium">{q.highRiskCount}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Fallback: Simple quarter overview when no capacity config */}
          {!hasCapacityConfig && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
                const qEngs = engagements.filter((e: any) => e.quarter === q);
                const qHours = qEngs.reduce((s: number, e: any) => s + getEngagementHours(e), 0);
                const qDays = qEngs.reduce((s: number, e: any) => s + (Number(e.estimated_days) || 0), 0);
                const uniqueAuditors = new Set<string>();
                qEngs.forEach((e: any) => {
                  if (e.lead_auditor_id) uniqueAuditors.add(e.lead_auditor_id);
                  (Array.isArray(e.supportive_auditor_ids) ? e.supportive_auditor_ids : []).forEach((id: string) => uniqueAuditors.add(id));
                });
                return (
                  <Card key={q}>
                    <CardContent className="pt-4 pb-3 px-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-foreground">{q}</span>
                        <Badge variant={qEngs.length > 0 ? 'default' : 'secondary'} className="text-xs">
                          {qEngs.length} audits
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between"><span>Hours</span><span className="font-medium text-foreground">{qHours}h</span></div>
                        <div className="flex justify-between"><span>Days</span><span className="font-medium text-foreground">{qDays}d</span></div>
                        <div className="flex justify-between"><span>Resources</span><span className="font-medium text-foreground">{uniqueAuditors.size}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Warnings Panel */}
          {distribution && distribution.warnings.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  Capacity & Distribution Warnings ({distribution.warnings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {distribution.warnings.map((w, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2 p-2.5 rounded border text-xs ${
                        w.severity === 'critical' 
                          ? 'border-destructive/30 bg-destructive/5 text-destructive' 
                          : w.severity === 'warning'
                            ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                            : 'border-border bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      {w.severity === 'critical' 
                        ? <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        : w.severity === 'warning'
                          ? <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          : <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      }
                      <span>{w.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Balanced confirmation */}
          {distribution && distribution.isBalanced && distribution.warnings.length === 0 && (
            <Card className="border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/20">
              <CardContent className="flex items-center gap-3 py-4">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-400">Balanced Distribution</p>
                  <p className="text-xs text-green-600 dark:text-green-500">
                    Engagements are evenly distributed across quarters. Balance score: {distribution.balanceScore}/100
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {distribution?.suggestedQuarter && (
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 px-1">
              <Info className="h-3.5 w-3.5" />
              <span>Next engagement suggestion: assign to <strong>{distribution.suggestedQuarter}</strong> (least-loaded quarter)</span>
            </div>
          )}
        </TabsContent>

        {/* ─── Resource Allocation Tab ─── */}
        <TabsContent value="resources" className="space-y-4">
          {/* Total Summary Bar */}
          <Card>
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <span className="font-medium">{engagements.length} Engagements</span>
                  </div>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{totalHours}h ({totalDays} days)</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{resourceData.length} auditors assigned</span>
                </div>
                {conflicts.length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />{conflicts.length} conflict(s)
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Resource Allocation by Auditor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {resourceData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No auditors assigned yet. Add engagements with lead and support auditors to see resource allocation.
                </p>
              ) : (
                <DataTable columns={resourceColumns} data={resourceData} emptyMessage="No resource data." />
              )}
            </CardContent>
          </Card>

          {conflicts.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Schedule Conflicts ({conflicts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {conflicts.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded border border-destructive/20 bg-destructive/5 text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium">{c.auditorName}</span> has overlapping dates between{' '}
                        <span className="font-medium">"{c.eng1}"</span> and <span className="font-medium">"{c.eng2}"</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Audit Timeline Tab ─── */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Audit Schedule Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: 'engagement_name', header: 'Engagement' },
                  { key: 'lead_auditor_id', header: 'Lead', render: (r: any) => r.lead_auditor_id ? getAuditorName(r.lead_auditor_id) : '—' },
                  { key: 'quarter', header: 'Q', render: (r: any) => r.quarter || '—' },
                  { key: 'estimated_hours', header: 'Hours', render: (r: any) => {
                    const h = getEngagementHours(r);
                    return h > 0 ? `${h}h` : '—';
                  }},
                  { key: 'estimated_days', header: 'Days', render: (r: any) => r.estimated_days ? `${r.estimated_days}d` : '—' },
                  { key: 'planned_start_date', header: 'Start', render: (r: any) => r.planned_start_date ? formatDateForDisplay(r.planned_start_date) : '—' },
                  { key: 'planned_end_date', header: 'End', render: (r: any) => r.planned_end_date ? formatDateForDisplay(r.planned_end_date) : '—' },
                  { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status || 'Planned'} /> },
                ]}
                data={engagements}
                emptyMessage="No engagements scheduled yet."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
