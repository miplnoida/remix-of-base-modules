import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { ApplicationWorkflowStatus } from '@/hooks/useApplicationWorkflowStatus';
import { formatDisplayDate } from '@/lib/dateFormat';
import { cn } from '@/lib/utils';

interface WorkflowStatusCellProps {
  status: ApplicationWorkflowStatus | null;
  isLoading?: boolean;
  fallbackStatus?: string;
}

/**
 * Get badge variant based on workflow status variant
 */
function getBadgeVariant(variant: ApplicationWorkflowStatus['displayStatusVariant']): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (variant) {
    case 'success':
    case 'approved':
      return 'default';
    case 'error':
    case 'rejected':
      return 'destructive';
    case 'pending':
    case 'warning':
    case 'in_progress':
      return 'secondary';
    default:
      return 'outline';
  }
}

/**
 * Get custom classes for badge styling based on variant
 */
function getBadgeClasses(variant: ApplicationWorkflowStatus['displayStatusVariant']): string {
  switch (variant) {
    case 'success':
    case 'approved':
      return 'bg-primary hover:bg-primary/90 text-primary-foreground border-primary';
    case 'error':
    case 'rejected':
      return 'bg-destructive hover:bg-destructive/90 text-destructive-foreground';
    case 'warning':
      return 'bg-accent hover:bg-accent/90 text-accent-foreground border-accent';
    case 'in_progress':
      return 'bg-secondary hover:bg-secondary/90 text-secondary-foreground border-secondary';
    case 'pending':
      return 'bg-accent hover:bg-accent/80 text-accent-foreground border-accent';
    default:
      return 'bg-muted hover:bg-muted/80';
  }
}

/**
 * Reusable component to display workflow status in application list tables
 * Shows workflow-driven status with clickable meeting status when applicable
 */
export function WorkflowStatusCell({ status, isLoading, fallbackStatus }: WorkflowStatusCellProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  // If no workflow status, show fallback
  if (!status) {
    return (
      <Badge variant="outline" className="bg-muted">
        {fallbackStatus || 'Pending'}
      </Badge>
    );
  }

  // If there's a meeting, show status badge with date/time underneath
  if (status.hasMeeting) {
    return (
      <div className="flex flex-col items-start gap-0.5">
        <Badge 
          variant={getBadgeVariant(status.displayStatusVariant)}
          className={cn(getBadgeClasses(status.displayStatusVariant))}
        >
          {status.displayStatus}
        </Badge>
        {(status.meetingDate || status.meetingTime) && (
          <span className="text-[10px] text-muted-foreground leading-tight pl-0.5">
            {status.meetingDate && formatDisplayDate(status.meetingDate)}
            {status.meetingDate && status.meetingTime && ' · '}
            {status.meetingTime}
          </span>
        )}
      </div>
    );
  }

  // Regular status badge
  return (
    <Badge 
      variant={getBadgeVariant(status.displayStatusVariant)}
      className={cn(getBadgeClasses(status.displayStatusVariant))}
    >
      {status.displayStatus}
    </Badge>
  );
}

export default WorkflowStatusCell;
