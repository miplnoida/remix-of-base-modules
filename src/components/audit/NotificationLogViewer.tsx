import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Loader2, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useAutoNotificationLog, type AutoNotificationLogEntry } from '@/hooks/useAuditNotificationTriggers';
import { formatDateForDisplay } from '@/lib/format-config';

interface NotificationLogViewerProps {
  engagementId?: string;
  planId?: string;
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  Queued: { icon: Clock, color: 'bg-amber-100 text-amber-800 border-amber-300' },
  Sent: { icon: CheckCircle2, color: 'bg-green-100 text-green-800 border-green-300' },
  Delivered: { icon: CheckCircle2, color: 'bg-green-100 text-green-800 border-green-300' },
  Failed: { icon: XCircle, color: 'bg-red-100 text-red-800 border-red-300' },
  Pending: { icon: Clock, color: 'bg-muted text-muted-foreground' },
};

const EVENT_LABELS: Record<string, string> = {
  PLAN_SUBMITTED: 'Plan Submitted',
  PLAN_APPROVED: 'Plan Approved',
  PLAN_REJECTED: 'Plan Rejected',
  PLAN_REVISION_SUBMITTED: 'Plan Revision',
  ENGAGEMENT_STARTED: 'Engagement Started',
  ENGAGEMENT_COMPLETED: 'Engagement Completed',
  FINDING_CREATED: 'New Finding',
  ACTION_ASSIGNED: 'Action Assigned',
  ACTION_OVERDUE: 'Action Overdue',
  ACTION_COMPLETED: 'Action Completed',
  REPORT_ISSUED: 'Report Issued',
  CLOSURE_APPROVED: 'Closure Approved',
  TEAM_CONFLICT_DETECTED: 'Team Conflict',
  COMMUNICATION_STAGE_SENT: 'Communication Sent',
  CARRY_FORWARD_CREATED: 'Carry Forward',
  ESCALATION_TRIGGERED: 'Escalation',
};

export function NotificationLogViewer({ engagementId, planId }: NotificationLogViewerProps) {
  const [eventFilter, setEventFilter] = useState<string>('all');

  const { data: logs = [], isLoading } = useAutoNotificationLog(
    engagementId,
    planId,
    eventFilter !== 'all' ? eventFilter : undefined
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Loading notifications...</span>
        </CardContent>
      </Card>
    );
  }

  const queuedCount = logs.filter(l => l.delivery_status === 'Queued').length;
  const sentCount = logs.filter(l => ['Sent', 'Delivered'].includes(l.delivery_status)).length;
  const failedCount = logs.filter(l => l.delivery_status === 'Failed').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Auto-Notification Log
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">{logs.length} total</Badge>
            {queuedCount > 0 && <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">{queuedCount} queued</Badge>}
            {sentCount > 0 && <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px]">{sentCount} sent</Badge>}
            {failedCount > 0 && <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px]">{failedCount} failed</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filter:</span>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="h-7 text-xs w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {Object.entries(EVENT_LABELS).map(([code, label]) => (
                <SelectItem key={code} value={code}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Log entries */}
        {logs.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No notification log entries found.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {logs.map((entry) => {
              const statusCfg = STATUS_CONFIG[entry.delivery_status] || STATUS_CONFIG.Pending;
              const StatusIcon = statusCfg.icon;
              return (
                <div key={entry.id} className="flex items-start gap-3 rounded-md border px-3 py-2 text-sm">
                  <StatusIcon className={`h-4 w-4 shrink-0 mt-0.5 ${entry.delivery_status === 'Failed' ? 'text-destructive' : 'text-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px]">
                        {EVENT_LABELS[entry.event_code] || entry.event_code}
                      </Badge>
                      <Badge className={`text-[9px] ${statusCfg.color}`}>
                        {entry.delivery_status}
                      </Badge>
                    </div>
                    {entry.subject && <p className="text-xs font-medium mt-1 truncate">{entry.subject}</p>}
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                      <span>{entry.created_at ? new Date(entry.created_at).toLocaleString() : '-'}</span>
                      {entry.recipient_email && <span>→ {entry.recipient_email}</span>}
                      {entry.channel && <span className="uppercase">{entry.channel}</span>}
                    </div>
                    {entry.failure_reason && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        {entry.failure_reason}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
