import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar, CheckCircle, Users } from 'lucide-react';
import { useAvailabilityConflicts, useAutoPlanCandidates } from '@/hooks/useAutoPlanEngine';
import { useIAActiveAuditors } from '@/hooks/useAuditData';
import { DataTable, StatusBadge } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { formatDateForDisplay } from '@/lib/format-config';

interface CapacityCalendarPanelProps {
  planId: string;
}

export function CapacityCalendarPanel({ planId }: CapacityCalendarPanelProps) {
  const { data: candidates = [] } = useAutoPlanCandidates(planId);
  const { data: conflicts = [] } = useAvailabilityConflicts(planId);
  const { data: auditors = [] } = useIAActiveAuditors();

  const getAuditorName = (id: string) => (auditors || []).find((a: any) => a.id === id)?.name || '—';

  const scheduledCandidates = candidates.filter((c: any) => c.suggested_start_date && c.accepted);

  // Build auditor workload summary
  const auditorMap = new Map<string, { name: string; engagements: number; totalHours: number }>();
  scheduledCandidates.forEach((c: any) => {
    if (c.suggested_lead_auditor_id) {
      const existing = auditorMap.get(c.suggested_lead_auditor_id) || {
        name: getAuditorName(c.suggested_lead_auditor_id),
        engagements: 0,
        totalHours: 0,
      };
      existing.engagements += 1;
      existing.totalHours += c.suggested_hours || 0;
      auditorMap.set(c.suggested_lead_auditor_id, existing);
    }
  });

  const auditorWorkload = Array.from(auditorMap.entries()).map(([id, data]) => ({
    id, ...data,
  }));

  const scheduleColumns: DataTableColumn<any>[] = [
    { key: 'rank_position', header: '#' },
    { key: 'entity_name', header: 'Audit', render: (r) => (
      <span className="text-sm">{r.entity_name}</span>
    )},
    { key: 'suggested_lead_auditor_id', header: 'Assigned Auditor', render: (r) => 
      r.suggested_lead_auditor_id ? getAuditorName(r.suggested_lead_auditor_id) : <span className="text-muted-foreground text-xs">Unassigned</span>
    },
    { key: 'suggested_start_date', header: 'Start', render: (r) => r.suggested_start_date ? formatDateForDisplay(r.suggested_start_date) : '—' },
    { key: 'suggested_end_date', header: 'End', render: (r) => r.suggested_end_date ? formatDateForDisplay(r.suggested_end_date) : '—' },
    { key: 'suggested_hours', header: 'Hours', render: (r) => r.suggested_hours || '—' },
  ];

  const conflictColumns: DataTableColumn<any>[] = [
    { key: 'conflict_type', header: 'Type', render: (r) => <StatusBadge status={r.conflict_type} /> },
    { key: 'conflict_details', header: 'Details', render: (r) => {
      const details = r.conflict_details || {};
      return <span className="text-xs">{details.entity || details.candidate_id || '—'}</span>;
    }},
    { key: 'detected_at', header: 'Detected', render: (r) => r.detected_at ? formatDateForDisplay(r.detected_at) : '—' },
  ];

  return (
    <div className="space-y-4">
      {/* Auditor Utilization Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Auditor Utilization
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditorWorkload.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Run "Schedule Capacity" on the Auto Plan tab to assign auditors to accepted candidates.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {auditorWorkload.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.engagements} audits • {a.totalHours}h</p>
                  </div>
                  <Badge variant={a.engagements > 4 ? 'destructive' : a.engagements > 2 ? 'secondary' : 'default'}>
                    {a.engagements > 4 ? 'Overloaded' : a.engagements > 2 ? 'High' : 'Normal'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduled Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Scheduled Engagements ({scheduledCandidates.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={scheduleColumns}
            data={scheduledCandidates}
            emptyMessage="No engagements scheduled yet. Accept candidates and run capacity scheduling."
          />
        </CardContent>
      </Card>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Availability Conflicts ({conflicts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={conflictColumns}
              data={conflicts}
              emptyMessage="No conflicts detected."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
