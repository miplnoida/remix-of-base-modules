import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WeeklyPlanItem } from '@/types/weeklyPlan';
import { DayOfWeek } from '@/hooks/useWeeklyPlanBuilder';
import { Calendar, Trash2, Clock, Building2, Binoculars, Phone, FileSearch, Star } from 'lucide-react';
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
  selectedDay: DayOfWeek | null;
  onSelectDay: (day: DayOfWeek) => void;
}

function getItemTypeIcon(itemType: string) {
  switch (itemType) {
    case 'SCOUTING': return <Binoculars className="h-3 w-3" />;
    case 'CALL': return <Phone className="h-3 w-3" />;
    case 'DESK_REVIEW': return <FileSearch className="h-3 w-3" />;
    default: return <Building2 className="h-3 w-3" />;
  }
}

function getPriorityDot(priority: string) {
  switch (priority) {
    case 'CRITICAL': return 'bg-destructive';
    case 'HIGH': return 'bg-orange-500';
    case 'MEDIUM': return 'bg-amber-500';
    default: return 'bg-muted-foreground/40';
  }
}

function getSourceBadge(sourceType: string | null) {
  switch (sourceType) {
    case 'VIOLATION': return { label: 'VIO', class: 'bg-destructive/10 text-destructive' };
    case 'FOLLOW_UP': return { label: 'F/U', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
    case 'CASE': return { label: 'CASE', class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' };
    case 'NOTICE': return { label: 'NTC', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    case 'SCOUTING_LEAD': return { label: 'SCT', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
    case 'MANUAL': return { label: 'MAN', class: 'bg-muted text-muted-foreground' };
    default: return null;
  }
}

function getTimeBlock(item: WeeklyPlanItem): 'AM' | 'PM' | 'FLEX' {
  if (item.duration === 'HALF_DAY_AM') return 'AM';
  if (item.duration === 'HALF_DAY_PM') return 'PM';
  if (item.scheduled_start_time) {
    return item.scheduled_start_time < '12:00' ? 'AM' : 'PM';
  }
  return 'FLEX';
}

function ItemCard({ item, canEdit, onRemove }: { item: WeeklyPlanItem; canEdit: boolean; onRemove: () => void }) {
  const sourceBadge = getSourceBadge(item.source_type);
  return (
    <div className="group flex items-start gap-1.5 p-1.5 bg-background rounded border border-transparent hover:border-border transition-colors">
      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${getPriorityDot(item.priority)}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          {getItemTypeIcon(item.item_type)}
          <span className="text-[11px] font-medium truncate">
            {item.employer_name || item.area_name || item.purpose || 'Untitled'}
          </span>
          {item.is_mandatory && <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500 shrink-0" />}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {item.scheduled_start_time && (
            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-2 w-2" />{item.scheduled_start_time}
            </span>
          )}
          {sourceBadge && (
            <Badge variant="outline" className={`text-[8px] px-1 py-0 leading-tight ${sourceBadge.class}`}>
              {sourceBadge.label}
            </Badge>
          )}
        </div>
      </div>
      {canEdit && (
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 shrink-0" onClick={onRemove}>
          <Trash2 className="h-2.5 w-2.5 text-destructive" />
        </Button>
      )}
    </div>
  );
}

function TimeBlockSection({ label, items, canEdit, onRemoveItem }: {
  label: string;
  items: WeeklyPlanItem[];
  canEdit: boolean;
  onRemoveItem: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mb-1 px-1">{label}</p>
      <div className="space-y-0.5">
        {items.map(item => (
          <ItemCard key={item.id} item={item} canEdit={canEdit} onRemove={() => onRemoveItem(item.id)} />
        ))}
      </div>
    </div>
  );
}

export function WeeklyBoardPanel({
  days,
  itemsByDay,
  onRemoveItem,
  canEdit,
  totalItems,
  selectedDay,
  onSelectDay,
}: WeeklyBoardPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Weekly Schedule Board</h3>
        </div>
        <Badge variant="secondary" className="text-xs">{totalItems} total items</Badge>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {days.map(day => {
          const items = itemsByDay[day.name] || [];
          const isTodayDate = (() => { try { return isToday(parseISO(day.date)); } catch { return false; } })();
          const isSelected = selectedDay === day.name;

          // Group by time block
          const amItems = items.filter(i => getTimeBlock(i) === 'AM');
          const pmItems = items.filter(i => getTimeBlock(i) === 'PM');
          const flexItems = items.filter(i => getTimeBlock(i) === 'FLEX');

          // Capacity estimation
          const totalHours = items.reduce((s, i) => {
            if (i.duration === 'FULL_DAY') return s + 7;
            if (i.duration === 'HALF_DAY_AM' || i.duration === 'HALF_DAY_PM') return s + 3.5;
            if (i.duration === 'SHORT') return s + 1;
            if (i.item_type === 'CALL') return s + 0.5;
            return s + 2;
          }, 0);
          const capacityPercent = Math.min(100, (totalHours / 8) * 100);

          return (
            <Card
              key={day.name}
              className={`cursor-pointer transition-all ${isTodayDate ? 'ring-2 ring-primary/50' : ''} ${isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm'}`}
              onClick={() => onSelectDay(day.name)}
            >
              <CardHeader className="pb-1 px-2 pt-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold">{day.name.substring(0, 3)}</CardTitle>
                  {isTodayDate && <Badge className="text-[8px] px-1 py-0 bg-primary">Today</Badge>}
                </div>
                <span className="text-[10px] text-muted-foreground">{day.label}</span>
                {/* Capacity bar */}
                <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full rounded-full transition-all ${capacityPercent > 100 ? 'bg-destructive' : capacityPercent > 75 ? 'bg-amber-500' : 'bg-primary'}`}
                    style={{ width: `${capacityPercent}%` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground">{totalHours.toFixed(1)}h / 8h</span>
              </CardHeader>
              <CardContent className="px-2 pb-2 space-y-1.5 min-h-[100px]" onClick={e => e.stopPropagation()}>
                {items.length === 0 ? (
                  <div className="text-center py-4 text-[10px] text-muted-foreground border border-dashed rounded">
                    No items
                  </div>
                ) : (
                  <>
                    <TimeBlockSection label="Morning" items={amItems} canEdit={canEdit} onRemoveItem={onRemoveItem} />
                    <TimeBlockSection label="Afternoon" items={pmItems} canEdit={canEdit} onRemoveItem={onRemoveItem} />
                    <TimeBlockSection label="Flexible" items={flexItems} canEdit={canEdit} onRemoveItem={onRemoveItem} />
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
