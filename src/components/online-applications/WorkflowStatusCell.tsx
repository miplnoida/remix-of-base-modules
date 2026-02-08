import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2 } from 'lucide-react';
import { ApplicationWorkflowStatus } from '@/hooks/useApplicationWorkflowStatus';
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
      return 'bg-green-600 hover:bg-green-700 text-white border-green-700';
    case 'error':
    case 'rejected':
      return 'bg-destructive hover:bg-destructive/90 text-destructive-foreground';
    case 'warning':
      return 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600';
    case 'in_progress':
      return 'bg-blue-500 hover:bg-blue-600 text-white border-blue-600';
    case 'pending':
      return 'bg-orange-500 hover:bg-orange-600 text-white border-orange-600';
    default:
      return 'bg-muted hover:bg-muted/80';
  }
}

/**
 * Reusable component to display workflow status in application list tables
 * Shows workflow-driven status with clickable meeting status when applicable
 */
export function WorkflowStatusCell({ status, isLoading, fallbackStatus }: WorkflowStatusCellProps) {
  const navigate = useNavigate();

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

  const handleMeetingClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status.meetingId) {
      navigate(`/meetings/manage/${status.meetingId}`);
    }
  };

  // If there's a meeting and it's clickable
  if (status.hasMeeting && status.isMeetingClickable) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-auto py-1 px-2 text-xs font-semibold',
          'gap-1.5',
          getBadgeClasses(status.displayStatusVariant)
        )}
        onClick={handleMeetingClick}
      >
        <Calendar className="h-3 w-3" />
        <span className="truncate max-w-[180px]">{status.displayStatus}</span>
      </Button>
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
