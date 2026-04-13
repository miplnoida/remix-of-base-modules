import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WeeklyPlanItem } from '@/types/weeklyPlan';
import { DayOfWeek } from '@/hooks/useWeeklyPlanBuilder';
import {
  Trash2,
  Clock,
  Building2,
  Binoculars,
  GripVertical,
  Phone,
  FileSearch,
} from 'lucide-react';

interface DayColumnProps {
  dayName: DayOfWeek;
  dateLabel: string;
  items: WeeklyPlanItem[];
  onRemoveItem: (itemId: string) => void;
  canEdit: boolean;
  isToday?: boolean;
}

function getItemTypeIcon(itemType: string) {
  switch (itemType) {
    case 'SCOUTING': return <Binoculars className="h-3.5 w-3.5" />;
    case 'CALL': return <Phone className="h-3.5 w-3.5" />;
    case 'DESK_REVIEW': return <FileSearch className="h-3.5 w-3.5" />;
    default: return <Building2 className="h-3.5 w-3.5" />;
  }
}

function getPriorityDot(priority: string) {
  switch (priority) {
    case 'CRITICAL': return 'bg-destructive';
    case 'HIGH': return 'bg-orange-500';
    case 'MEDIUM': return 'bg-yellow-500';
    default: return 'bg-muted-foreground/40';
  }
}

function getSourceBadge(sourceType: string | null) {
  switch (sourceType) {
    case 'VIOLATION': return { label: 'VIO', class: 'bg-destructive/10 text-destructive' };
    case 'FOLLOW_UP': return { label: 'F/U', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
    case 'CASE': return { label: 'CASE', class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' };
    case 'NOTICE': return { label: 'NTC', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    case 'SCOUTING_LEAD': return { label: 'SCT', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
    case 'MANUAL': return { label: 'MAN', class: 'bg-muted text-muted-foreground' };
    default: return null;
  }
}

export function DayColumn({ dayName, dateLabel, items, onRemoveItem, canEdit, isToday }: DayColumnProps) {
  return (
    <Card className={`flex-1 min-w-0 ${isToday ? 'ring-2 ring-primary/50' : ''}`}>
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{dayName}</CardTitle>
          <span className="text-xs text-muted-foreground">{dateLabel}</span>
        </div>
        <Badge variant="outline" className="text-[10px] w-fit">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </Badge>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-1.5 min-h-[120px]">
        {items.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-md">
            No items
          </div>
        ) : (
          items.map(item => {
            const sourceBadge = getSourceBadge(item.source_type);
            return (
              <div
                key={item.id}
                className="group flex items-start gap-1.5 p-2 bg-muted/40 rounded-md border border-transparent hover:border-border transition-colors"
              >
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${getPriorityDot(item.priority)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    {getItemTypeIcon(item.item_type)}
                    <span className="text-xs font-medium truncate">
                      {item.employer_name || item.area_name || item.purpose || 'Untitled'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {item.scheduled_start_time && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {item.scheduled_start_time}
                      </span>
                    )}
                    {sourceBadge && (
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 ${sourceBadge.class}`}>
                        {sourceBadge.label}
                      </Badge>
                    )}
                    {item.source_ref && (
                      <span className="text-[10px] text-muted-foreground font-mono">{item.source_ref}</span>
                    )}
                  </div>
                  {item.purpose && item.purpose !== item.employer_name && (
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.purpose}</p>
                  )}
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
