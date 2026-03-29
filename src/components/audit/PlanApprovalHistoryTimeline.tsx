import React from 'react';
import { useIAPlanApprovalHistory } from '@/hooks/useAuditPlanApproval';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, Send, AlertTriangle, Loader2, FileText, Undo2, Archive } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';

interface Props {
  planId: string;
}

const actionIcons: Record<string, React.ElementType> = {
  Submitted: Send,
  Approved: CheckCircle2,
  Rejected: XCircle,
  'Changes Requested': AlertTriangle,
  Withdrawn: Undo2,
  'Amendment Pending': AlertTriangle,
  Superseded: Archive,
};

const actionColors: Record<string, string> = {
  Submitted: 'text-blue-600',
  Approved: 'text-green-600',
  Rejected: 'text-destructive',
  'Changes Requested': 'text-amber-600',
  Withdrawn: 'text-muted-foreground',
  'Amendment Pending': 'text-orange-600',
  Superseded: 'text-muted-foreground',
};

const badgeColors: Record<string, string> = {
  Submitted: 'bg-blue-100 text-blue-800 border-blue-300',
  Approved: 'bg-green-100 text-green-800 border-green-300',
  Rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  'Changes Requested': 'bg-amber-100 text-amber-800 border-amber-300',
  Withdrawn: 'bg-muted text-muted-foreground',
  'Amendment Pending': 'bg-orange-100 text-orange-800 border-orange-300',
  Superseded: 'bg-muted text-muted-foreground',
};

export function PlanApprovalHistoryTimeline({ planId }: Props) {
  const { data: history = [], isLoading } = useIAPlanApprovalHistory(planId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Loading approval history...</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <FileText className="h-10 w-10 mb-2" />
        <p className="text-sm">No approval actions recorded yet.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Approval History ({history.length} actions)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
          <div className="space-y-3">
            {history.map((entry: any) => {
              const Icon = actionIcons[entry.action] || Clock;
              const iconColor = actionColors[entry.action] || 'text-muted-foreground';
              const badgeColor = badgeColors[entry.action] || 'bg-muted text-muted-foreground';

              return (
                <div key={entry.id} className="flex gap-3 relative">
                  <div className="relative z-10 shrink-0 mt-1">
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                  </div>
                  <div className="flex-1 rounded-md border px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className={`text-[10px] ${badgeColor}`}>
                        {entry.action}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {entry.created_at ? formatDateForDisplay(entry.created_at) : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>By: <strong>{entry.performed_by || '—'}</strong></span>
                    </div>
                    {entry.comments && (
                      <p className="text-xs text-muted-foreground mt-1 italic border-l-2 border-muted pl-2">
                        {entry.comments}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
