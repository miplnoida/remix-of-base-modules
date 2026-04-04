/**
 * Claim Workbench — Section 10: Status History
 * 
 * Source: bn_claim_event (filtered for status transitions)
 * Future: bn_claim_status_history (dedicated table)
 * Read-only — full audit trail of status changes
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, ArrowRight, User, Clock } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';
import type { ClaimStatusHistoryEntry } from '@/services/bn/claimWorkbenchService';

interface StatusHistorySectionProps {
  history: ClaimStatusHistoryEntry[];
  isLoading: boolean;
}

export const StatusHistorySection: React.FC<StatusHistorySectionProps> = ({ history, isLoading }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base font-medium flex items-center gap-2">
        <History className="h-4 w-4" /> Status History
        <Badge variant="secondary" className="text-xs">{history.length}</Badge>
      </CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No status transitions recorded</p>
      ) : (
        <div className="space-y-0 relative max-h-80 overflow-y-auto">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
          {history.map((entry) => (
            <div key={entry.id} className="relative pl-10 pb-4">
              <div className="absolute left-[11px] w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
              <div className="flex items-center gap-2 text-sm">
                {entry.from_status && (
                  <>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{entry.from_status.replace(/_/g, ' ')}</Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </>
                )}
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30">
                  {entry.to_status.replace(/_/g, ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDateForDisplay(entry.performed_at)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{entry.performed_by}</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0">{entry.event_type}</Badge>
              </div>
              {entry.notes && <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);
