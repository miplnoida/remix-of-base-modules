import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, Clock, X, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AvailabilityConflict } from '@/hooks/useAuditWorkflowGates';
import { formatDateForDisplay } from '@/lib/format-config';

interface ConflictAlertPanelProps {
  conflicts: AvailabilityConflict[];
  onDismiss?: () => void;
  compact?: boolean;
}

export function ConflictAlertPanel({ conflicts, onDismiss, compact = false }: ConflictAlertPanelProps) {
  if (!conflicts || conflicts.length === 0) return null;

  const blockingCount = conflicts.filter(c => c.severity === 'blocking').length;
  const warningCount = conflicts.filter(c => c.severity === 'warning').length;

  const getConflictIcon = (type: string) => {
    switch (type) {
      case 'holiday': return <Calendar className="h-4 w-4" />;
      case 'leave': return <Clock className="h-4 w-4" />;
      case 'engagement_overlap': return <Users className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getConflictLabel = (type: string) => {
    switch (type) {
      case 'holiday': return 'Holiday';
      case 'leave': return 'Leave';
      case 'engagement_overlap': return 'Overlap';
      default: return type;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
        <span className="text-destructive font-medium">
          {blockingCount > 0 ? `${blockingCount} blocking` : ''}{blockingCount > 0 && warningCount > 0 ? ', ' : ''}{warningCount > 0 ? `${warningCount} warning` : ''} conflict(s)
        </span>
        {onDismiss && (
          <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto" onClick={onDismiss}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={blockingCount > 0 ? 'border-destructive/40 bg-destructive/5' : 'border-amber-300/40 bg-amber-50/30'}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-5 w-5 ${blockingCount > 0 ? 'text-destructive' : 'text-amber-600'}`} />
          <CardTitle className="text-sm">
            Team Availability Conflicts ({conflicts.length})
          </CardTitle>
          {blockingCount > 0 && (
            <Badge variant="destructive" className="text-xs">{blockingCount} Blocking</Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="outline" className="text-xs border-amber-400 text-amber-700">{warningCount} Warning</Badge>
          )}
        </div>
        {onDismiss && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {conflicts.map((conflict, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm ${
                conflict.severity === 'blocking'
                  ? 'border-destructive/30 bg-destructive/5 text-destructive'
                  : 'border-amber-200 bg-amber-50/50 text-amber-800'
              }`}
            >
              {getConflictIcon(conflict.type)}
              <Badge variant="outline" className="text-[10px] shrink-0">{getConflictLabel(conflict.type)}</Badge>
              <span className="truncate flex-1">
                {conflict.auditor_name && <strong>{conflict.auditor_name}: </strong>}
                {conflict.reference || 'Conflict detected'}
                {conflict.date && ` on ${formatDateForDisplay(conflict.date)}`}
                {conflict.date_start && conflict.date_end && ` (${formatDateForDisplay(conflict.date_start)} – ${formatDateForDisplay(conflict.date_end)})`}
                {conflict.leave_type && ` [${conflict.leave_type}]`}
              </span>
              <Badge variant={conflict.severity === 'blocking' ? 'destructive' : 'outline'} className="text-[10px] shrink-0">
                {conflict.severity}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
