import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WeeklyPlanItem } from '@/types/weeklyPlan';
import { DayOfWeek } from '@/hooks/useWeeklyPlanBuilder';
import { DayColumn } from './DayColumn';
import { Calendar } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';

interface DayInfo {
  name: DayOfWeek;
  date: string;
  label: string;
}

interface WeeklyBoardPanelProps {
  days: DayInfo[];
  itemsByDay: Record<DayOfWeek, WeeklyPlanItem[]>;
  onRemoveItem: (itemId: string) => void;
  canEdit: boolean;
  totalItems: number;
}

export function WeeklyBoardPanel({
  days,
  itemsByDay,
  onRemoveItem,
  canEdit,
  totalItems,
}: WeeklyBoardPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Weekly Board</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {totalItems} total items
        </Badge>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {days.map(day => (
          <DayColumn
            key={day.name}
            dayName={day.name}
            dateLabel={day.label}
            items={itemsByDay[day.name] || []}
            onRemoveItem={onRemoveItem}
            canEdit={canEdit}
            isToday={(() => {
              try { return isToday(parseISO(day.date)); } catch { return false; }
            })()}
          />
        ))}
      </div>
    </div>
  );
}
