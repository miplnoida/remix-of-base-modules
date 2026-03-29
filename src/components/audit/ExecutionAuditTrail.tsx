import React from 'react';
import { Loader2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useExecutionLog } from '@/hooks/useEngagementExecution';
import { formatDateForDisplay } from '@/lib/format-config';

interface Props {
  engagementId: string;
}

export function ExecutionAuditTrail({ engagementId }: Props) {
  const { data: logs = [], isLoading } = useExecutionLog(engagementId);

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No execution events recorded yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Execution Audit Trail</CardTitle></CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {logs.map((log: any, idx: number) => (
            <div key={log.id} className="flex gap-3 pb-4 last:pb-0">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                {idx < logs.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
              </div>
              {/* Content */}
              <div className="min-w-0 flex-1 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">{log.event_type?.replace(/_/g, ' ')}</span>
                  {log.old_status && log.new_status && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      {log.old_status} <ArrowRight className="h-2.5 w-2.5" /> {log.new_status}
                    </span>
                  )}
                </div>
                {log.event_description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{log.event_description}</p>
                )}
                <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                  <span>{log.performed_at ? formatDateForDisplay(log.performed_at) : '—'}</span>
                  {log.performed_at && (
                    <span>{new Date(log.performed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                  {log.performed_by && <span>by {log.performed_by}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
