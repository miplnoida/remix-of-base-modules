/**
 * Workflow & Audit Tab — Shows claim workflow state and audit trail
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch, Shield, Clock, User } from 'lucide-react';
import { useBnClaimEvents } from '@/hooks/bn/useBnClaim';
import { BnEmptyState, BnStatusBadge } from '@/components/bn/shared';
import { formatDateForDisplay } from '@/lib/format-config';

interface WorkflowAuditTabProps {
  claimId: string;
}

export const WorkflowAuditTab: React.FC<WorkflowAuditTabProps> = ({ claimId }) => {
  const { data: events = [], isLoading } = useBnClaimEvents(claimId);

  if (isLoading) return <BnEmptyState type="loading" title="Loading workflow history..." />;

  return (
    <div className="space-y-6">
      {/* Workflow Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4 text-muted-foreground" /> Workflow History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <BnEmptyState type="empty" title="No workflow events" description="Events appear as the claim progresses." />
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-6">
                {events.map((event, index) => (
                  <div key={event.id} className="relative flex gap-4 pl-10">
                    {/* Timeline dot */}
                    <div className="absolute left-[11px] top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary bg-background">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    
                    <div className="flex-1 rounded-lg border bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{event.event_type?.replace(/_/g, ' ')}</span>
                            {event.from_status && event.to_status && (
                              <div className="flex items-center gap-1">
                                <BnStatusBadge status={event.from_status} size="sm" />
                                <span className="text-muted-foreground text-xs">→</span>
                                <BnStatusBadge status={event.to_status} size="sm" />
                              </div>
                            )}
                          </div>
                          {event.notes && (
                            <p className="mt-1 text-sm text-muted-foreground">{event.notes}</p>
                          )}
                        </div>
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatDateForDisplay(event.performed_at)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{event.performed_by || 'System'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
