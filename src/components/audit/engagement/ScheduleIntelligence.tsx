import React, { useMemo } from 'react';
import { AlertTriangle, Calendar, Clock, User } from 'lucide-react';

interface ScheduleIntelligenceProps {
  leadAuditorId: string;
  leadAuditorName: string;
  currentEngagementId?: string;
  allEngagements: any[];
  plannedStartDate: string;
  plannedEndDate: string;
  quarter: string;
}

export function ScheduleIntelligence({
  leadAuditorId,
  leadAuditorName,
  currentEngagementId,
  allEngagements,
  plannedStartDate,
  plannedEndDate,
  quarter,
}: ScheduleIntelligenceProps) {
  const insights = useMemo(() => {
    if (!leadAuditorId) return null;

    const otherEngs = allEngagements.filter(
      (e: any) => e.lead_auditor_id === leadAuditorId && e.id !== currentEngagementId
    );

    const totalAssigned = otherEngs.length;
    const totalDays = otherEngs.reduce((s: number, e: any) => s + (Number(e.estimated_days) || 0), 0);

    // Same quarter
    const sameQuarter = quarter
      ? otherEngs.filter((e: any) => e.quarter === quarter)
      : [];
    const quarterDays = sameQuarter.reduce((s: number, e: any) => s + (Number(e.estimated_days) || 0), 0);

    // Overlap detection
    const overlaps: string[] = [];
    if (plannedStartDate && plannedEndDate) {
      const start = new Date(plannedStartDate);
      const end = new Date(plannedEndDate);
      otherEngs.forEach((e: any) => {
        if (e.planned_start_date && e.planned_end_date) {
          const eStart = new Date(e.planned_start_date);
          const eEnd = new Date(e.planned_end_date);
          if (start <= eEnd && end >= eStart) {
            overlaps.push(e.engagement_name || 'Untitled');
          }
        }
      });
    }

    // Support role
    const supportEngs = allEngagements.filter(
      (e: any) =>
        e.id !== currentEngagementId &&
        Array.isArray(e.supportive_auditor_ids) &&
        e.supportive_auditor_ids.includes(leadAuditorId)
    );

    return { totalAssigned, totalDays, sameQuarter: sameQuarter.length, quarterDays, overlaps, supportCount: supportEngs.length };
  }, [leadAuditorId, currentEngagementId, allEngagements, plannedStartDate, plannedEndDate, quarter]);

  if (!insights || !leadAuditorId) return null;

  const hasWarnings = insights.overlaps.length > 0 || insights.quarterDays > 40;

  return (
    <div className={`rounded-md border p-3 space-y-2 ${hasWarnings ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800' : 'bg-muted/30'}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <User className="h-4 w-4 text-muted-foreground" />
        <span>Resource Intelligence — {leadAuditorName || 'Selected Auditor'}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span><strong>{insights.totalAssigned}</strong> other engagement{insights.totalAssigned !== 1 ? 's' : ''} assigned</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span><strong>{insights.totalDays}</strong> total planned days</span>
        </div>
        {quarter && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span><strong>{insights.quarterDays}</strong> days in {quarter}</span>
          </div>
        )}
        {insights.supportCount > 0 && (
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3 text-muted-foreground" />
            <span>Support on <strong>{insights.supportCount}</strong> other</span>
          </div>
        )}
      </div>

      {insights.overlaps.length > 0 && (
        <div className="flex items-start gap-2 p-2 rounded bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs">
            <p className="font-medium text-amber-800 dark:text-amber-300">Schedule Overlap Detected</p>
            <p className="text-amber-700 dark:text-amber-400">
              Overlapping with: {insights.overlaps.join(', ')}
            </p>
          </div>
        </div>
      )}

      {insights.quarterDays > 40 && (
        <div className="flex items-start gap-2 p-2 rounded bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <strong>High workload:</strong> {insights.quarterDays} days already planned in {quarter}
          </p>
        </div>
      )}
    </div>
  );
}
