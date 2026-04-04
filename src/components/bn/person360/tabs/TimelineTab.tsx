/**
 * Person 360 — Timeline Tab
 * 
 * Source: bn_claim_event
 * Future: bn_audit_event, bn_claim_status_history
 * Read-only chronological stream of all events across claims
 * Role visibility: Claims Officer, Supervisor, Admin, Auditor
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { formatDateForDisplay } from '@/lib/format-config';
import { ArrowRight, User, Clock } from 'lucide-react';
import type { Person360TimelineEvent } from '@/services/bn/person360Service';

interface TimelineTabProps {
  events: Person360TimelineEvent[];
  isLoading?: boolean;
}

export const TimelineTab: React.FC<TimelineTabProps> = ({ events, isLoading }) => {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading timeline...</div>;
  }

  if (events.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No events recorded</div>;
  }

  return (
    <div className="space-y-0 relative">
      <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
      {events.map((event, idx) => (
        <div key={event.id} className="relative pl-14 pb-6">
          {/* Dot */}
          <div className="absolute left-[19px] w-3 h-3 rounded-full bg-primary border-2 border-background" />

          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                  {event.event_type.replace(/_/g, ' ')}
                </Badge>
                {event.claim_number && (
                  <span className="text-xs font-mono text-muted-foreground">#{event.claim_number}</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {event.performed_at ? formatDateForDisplay(event.performed_at) : '—'}
              </div>
            </div>

            {event.description && (
              <p className="text-sm text-foreground">{event.description}</p>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" /> {event.performed_by}
              </span>
              {event.from_status && event.to_status && (
                <span className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px] px-1 py-0">{event.from_status}</Badge>
                  <ArrowRight className="h-3 w-3" />
                  <Badge variant="outline" className="text-[10px] px-1 py-0">{event.to_status}</Badge>
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
