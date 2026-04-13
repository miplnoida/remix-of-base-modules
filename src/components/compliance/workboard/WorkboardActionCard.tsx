import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FollowUpAction, ACTION_TYPE_LABELS, ActionType, ActionStatus } from '@/types/violationActions';
import { 
  Play, CheckCircle, XCircle, CalendarClock, FileText,
  Phone, MapPin, Mail, FileSearch, AlertTriangle, Clock, Building2
} from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';

const ACTION_ICONS: Record<string, React.ElementType> = {
  CALL: Phone,
  VISIT: MapPin,
  LETTER: Mail,
  DOCUMENT_REQUEST: FileSearch,
  INSPECTION: MapPin,
  REVIEW: FileText,
  ESCALATION: AlertTriangle,
};

interface Props {
  action: FollowUpAction;
  isOverdue?: boolean;
  onStart?: (id: string) => void;
  onComplete?: (action: FollowUpAction) => void;
  onCancel?: (action: FollowUpAction) => void;
  onReschedule?: (action: FollowUpAction) => void;
  onViewDetails?: (action: FollowUpAction) => void;
}

export const WorkboardActionCard: React.FC<Props> = ({
  action, isOverdue, onStart, onComplete, onCancel, onReschedule, onViewDetails,
}) => {
  const Icon = ACTION_ICONS[action.action_type] || FileText;
  const typeLabel = ACTION_TYPE_LABELS[action.action_type as ActionType] || action.action_type;

  const priorityVariant = action.priority === 'URGENT' ? 'destructive' as const
    : action.priority === 'HIGH' ? 'warning' as const : 'secondary' as const;

  const statusColor = action.status === ActionStatus.IN_PROGRESS ? 'text-blue-600'
    : action.status === ActionStatus.SCHEDULED ? 'text-green-600' : 'text-muted-foreground';

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-accent/30 ${
      isOverdue ? 'border-destructive/40 bg-destructive/5' : 'bg-card'
    }`}>
      <div className={`p-2 rounded-lg flex-shrink-0 ${isOverdue ? 'bg-destructive/10' : 'bg-muted'}`}>
        <Icon className={`h-4 w-4 ${isOverdue ? 'text-destructive' : 'text-foreground'}`} />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{typeLabel}</span>
          <Badge variant={priorityVariant} className="text-[10px] h-5">{action.priority}</Badge>
          {isOverdue && (
            <Badge variant="destructive" className="text-[10px] h-5">
              <AlertTriangle className="h-3 w-3 mr-0.5" /> Overdue
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">{action.description}</p>
        {action.employer_name && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Building2 className="h-3 w-3" /> {action.employer_name}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {action.due_date && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-destructive font-medium' : ''}`}>
              <Clock className="h-3 w-3" /> Due: {formatDateForDisplay(action.due_date)}
            </span>
          )}
          <span className={statusColor}>{action.status.replace('_', ' ')}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0">
        {action.status === ActionStatus.PLANNED && onStart && (
          <Button size="sm" variant="default" className="h-7 text-xs px-2" onClick={() => onStart(action.id)}>
            <Play className="h-3 w-3 mr-1" /> Start
          </Button>
        )}
        {action.status === ActionStatus.IN_PROGRESS && onComplete && (
          <Button size="sm" variant="default" className="h-7 text-xs px-2" onClick={() => onComplete(action)}>
            <CheckCircle className="h-3 w-3 mr-1" /> Complete
          </Button>
        )}
        {onReschedule && action.status !== ActionStatus.COMPLETED && (
          <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => onReschedule(action)}>
            <CalendarClock className="h-3 w-3 mr-1" /> Reschedule
          </Button>
        )}
        {onViewDetails && (
          <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => onViewDetails(action)}>
            Details
          </Button>
        )}
      </div>
    </div>
  );
};
