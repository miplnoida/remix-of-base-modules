import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar, Users, Clock, BarChart3 } from 'lucide-react';
import { useIAPlanEngagements } from '@/hooks/useAuditPlanChangeLog';
import { useIAActiveAuditors } from '@/hooks/useAuditData';
import { DataTable, StatusBadge } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { formatDateForDisplay } from '@/lib/format-config';
import { Progress } from '@/components/ui/progress';

interface CapacityCalendarPanelProps {
  planId: string;
}

export function CapacityCalendarPanel({ planId }: CapacityCalendarPanelProps) {
  const { data: engagements = [] } = useIAPlanEngagements(planId);
  const { data: auditors = [] } = useIAActiveAuditors();

  const getAuditorName = (id: string) => (auditors || []).find((a: any) => a.id === id)?.name || '—';

  // Build resource-centric view: each auditor → their engagements and total days
  const resourceData = useMemo(() => {
    const map = new Map<string, { name: string; role: string; engagements: any[]; totalDays: number; totalWeeks: number; quarters: Set<string> }>();
    
    engagements.forEach((e: any) => {
      const days = Number(e.estimated_days) || 0;
      const weeks = Number(e.estimated_hours) || 0; // estimated_hours stores weeks now
      const quarter = e.quarter || '';
      
      // Lead auditor
      if (e.lead_auditor_id) {
        const auditor = (auditors || []).find((a: any) => a.id === e.lead_auditor_id);
        const existing = map.get(e.lead_auditor_id) || { name: auditor?.name || '—', role: 'Lead', engagements: [], totalDays: 0, totalWeeks: 0, quarters: new Set<string>() };
        existing.engagements.push({ ...e, assignmentRole: 'Lead' });
        existing.totalDays += days;
        existing.totalWeeks += weeks;
        if (quarter) existing.quarters.add(quarter);
        map.set(e.lead_auditor_id, existing);
      }
      
      // Support auditors
      const supportIds = Array.isArray(e.supportive_auditor_ids) ? e.supportive_auditor_ids : [];
      supportIds.forEach((sid: string) => {
        const auditor = (auditors || []).find((a: any) => a.id === sid);
        const existing = map.get(sid) || { name: auditor?.name || '—', role: 'Support', engagements: [], totalDays: 0, totalWeeks: 0, quarters: new Set<string>() };
        existing.engagements.push({ ...e, assignmentRole: 'Support' });
        existing.totalDays += Math.round(days * 0.5); // Support typically 50% allocation
        existing.totalWeeks += Math.round(weeks * 0.5);
        if (quarter) existing.quarters.add(quarter);
        map.set(sid, existing);
      });
    });
    
    return Array.from(map.entries()).map(([id, data]) => ({
      id,
      ...data,
      quartersStr: Array.from(data.quarters).sort().join(', '),
    })).sort((a, b) => b.totalDays - a.totalDays);
  }, [engagements, auditors]);

  // Detect schedule conflicts (overlapping dates for same auditor)
  const conflicts = useMemo(() => {
    const issues: { auditorName: string; eng1: string; eng2: string; type: string }[] = [];
    
    resourceData.forEach((resource) => {
      const dated = resource.engagements.filter((e: any) => e.planned_start_date && e.planned_end_date);
      for (let i = 0; i < dated.length; i++) {
        for (let j = i + 1; j < dated.length; j++) {
          const a = dated[i], b = dated[j];
          if (a.planned_start_date <= b.planned_end_date && b.planned_start_date <= a.planned_end_date) {
            issues.push({
              auditorName: resource.name,
              eng1: a.engagement_name,
              eng2: b.engagement_name,
              type: 'Date Overlap',
            });
          }
        }
      }
    });
    
    return issues;
  }, [resourceData]);

  // Quarterly summary
  const quarterSummary = useMemo(() => {
    return ['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
      const qEngs = engagements.filter((e: any) => e.quarter === q);
      const uniqueAuditors = new Set<string>();
      qEngs.forEach((e: any) => {
        if (e.lead_auditor_id) uniqueAuditors.add(e.lead_auditor_id);
        (Array.isArray(e.supportive_auditor_ids) ? e.supportive_auditor_ids : []).forEach((id: string) => uniqueAuditors.add(id));
      });
      return {
        quarter: q,
        engagements: qEngs.length,
        totalDays: qEngs.reduce((s: number, e: any) => s + (Number(e.estimated_days) || 0), 0),
        auditors: uniqueAuditors.size,
      };
    });
  }, [engagements]);

  const totalDays = engagements.reduce((s: number, e: any) => s + (Number(e.estimated_days) || 0), 0);

  const resourceColumns: DataTableColumn<any>[] = [
    { key: 'name', header: 'Auditor', render: (r) => (
      <div>
        <p className="text-sm font-medium">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.engagements.length} engagement(s)</p>
      </div>
    )},
    { key: 'totalDays', header: 'Total Days', render: (r) => (
      <span className="font-semibold text-sm">{r.totalDays}d</span>
    )},
    { key: 'totalWeeks', header: 'Total Weeks', render: (r) => (
      <span className="text-sm">{r.totalWeeks}w</span>
    )},
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
      {/* Quarterly Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quarterSummary.map(q => (
          <Card key={q.quarter}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-foreground">{q.quarter}</span>
                <Badge variant={q.engagements > 0 ? 'default' : 'secondary'} className="text-xs">
                  {q.engagements} audits
                </Badge>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Days planned</span>
                  <span className="font-medium text-foreground">{q.totalDays}d</span>
                </div>
                <div className="flex justify-between">
                  <span>Resources</span>
                  <span className="font-medium text-foreground">{q.auditors} auditor(s)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
              <span className="text-muted-foreground">{totalDays} total days</span>
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

      {/* Resource Allocation Table */}
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

      {/* Schedule Conflicts */}
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

      {/* Engagement Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Engagement Schedule Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'engagement_name', header: 'Engagement' },
              { key: 'lead_auditor_id', header: 'Lead', render: (r: any) => r.lead_auditor_id ? getAuditorName(r.lead_auditor_id) : '—' },
              { key: 'quarter', header: 'Q', render: (r: any) => r.quarter || '—' },
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
    </div>
  );
}
