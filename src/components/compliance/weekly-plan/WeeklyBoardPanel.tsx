import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WeeklyPlanItem } from '@/types/weeklyPlan';
import { DayOfWeek } from '@/hooks/useWeeklyPlanBuilder';
import {
  Calendar, Trash2, Clock, Building2, Binoculars, Phone,
  FileSearch, Star, AlertTriangle,
} from 'lucide-react';
import { isToday, parseISO } from 'date-fns';

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
    case 'SCOUTING': return <Binoculars className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
    case 'CALL': return <Phone className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />;
    case 'DESK_REVIEW': return <FileSearch className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />;
    default: return <Building2 className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />;
  }
}

function getItemTypeLabel(itemType: string) {
  switch (itemType) {
    case 'SCOUTING': return 'Scouting';
    case 'CALL': return 'Call';
    case 'DESK_REVIEW': return 'Desk Review';
    case 'NOTICE_FOLLOW_UP': return 'Notice F/U';
    case 'MEETING': return 'Meeting';
    default: return 'Visit';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'CRITICAL': return 'border-l-destructive';
    case 'HIGH': return 'border-l-orange-500';
    case 'MEDIUM': return 'border-l-amber-400';
    default: return 'border-l-muted';
  }
}

function formatTime(time: string | null): string {
  if (!time) return '';
  // Handle "HH:MM:SS" or "HH:MM" formats
  const parts = time.split(':');
  const hour = parseInt(parts[0], 10);
  const min = parts[1] || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${min} ${ampm}`;
}

function getTimeBlock(item: WeeklyPlanItem): 'AM' | 'PM' | 'FLEX' {
  if (item.duration === 'HALF_DAY_AM') return 'AM';
  if (item.duration === 'HALF_DAY_PM') return 'PM';
  if (item.scheduled_start_time) {
    const hour = parseInt(item.scheduled_start_time.split(':')[0], 10);
    return hour < 12 ? 'AM' : 'PM';
  }
  return 'FLEX';
}

function estimateItemHours(item: WeeklyPlanItem): number {
  if (item.duration === 'FULL_DAY') return 7;
  if (item.duration === 'HALF_DAY_AM' || item.duration === 'HALF_DAY_PM') return 3;
  if (item.duration === 'SHORT') return 1;
  if (item.item_type === 'CALL') return 0.5;
  return 2;
}

function ItemCard({
  item, canEdit, onRemove,
}: {
  item: WeeklyPlanItem;
  canEdit: boolean;
  onRemove: () => void;
}) {
  const name = item.employer_name || item.area_name || item.purpose || 'Untitled';

  return (
    <div className={`group flex items-start gap-2 p-2 rounded-md border-l-[3px] bg-card hover:bg-accent/30 transition-colors ${getPriorityColor(item.priority)}`}>
      <div className="mt-0.5 shrink-0">{getItemTypeIcon(item.item_type)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium truncate" title={name}>{name}</span>
          {item.is_mandatory && (
            <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground">{getItemTypeLabel(item.item_type)}</span>
          {item.scheduled_start_time && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {formatTime(item.scheduled_start_time)}
            </span>
          )}
          {item.source_ref && (
            <span className="text-[10px] font-mono text-muted-foreground">{item.source_ref}</span>
          )}
        </div>
      </div>
      {canEdit && (
        <Button variant="ghost" size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 shrink-0"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}>
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      )}
    </div>
  );
}

function TimeBlockGroup({ label, items, canEdit, onRemoveItem }: {
  label: string;
  items: WeeklyPlanItem[];
  canEdit: boolean;
  onRemoveItem: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
        {label}
      </p>
      {items.map(item => (
        <ItemCard key={item.id} item={item} canEdit={canEdit} onRemove={() => onRemoveItem(item.id)} />
      ))}
    </div>
  );
}

export function WeeklyBoardPanel({
  days, itemsByDay, onRemoveItem, canEdit, totalItems, selectedDay, onSelectDay,
}: WeeklyBoardPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Weekly Schedule Board</h3>
        </div>
        <Badge variant="secondary" className="text-xs">{totalItems} items</Badge>
      </div>

      {/* Day tabs */}
      <div className="flex gap-1.5">
        {days.map(day => {
          const items = itemsByDay[day.name] || [];
          const isTodayDate = (() => { try { return isToday(parseISO(day.date)); } catch { return false; } })();
          const isSelected = selectedDay === day.name;
          const totalHours = items.reduce((s, i) => s + estimateItemHours(i), 0);
          const isOverCap = totalHours > 7;

          return (
            <button
              key={day.name}
              onClick={() => onSelectDay(day.name)}
              className={`flex-1 rounded-lg p-2 text-center transition-all border ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/50 bg-card'
              } ${isTodayDate ? 'ring-1 ring-primary/30' : ''}`}
            >
              <p className="text-xs font-semibold">{day.name.substring(0, 3)}</p>
              <p className="text-[10px] text-muted-foreground">{day.label}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Badge
                  variant={items.length > 0 ? 'default' : 'outline'}
                  className="text-[10px] h-4 px-1.5"
                >
                  {items.length}
                </Badge>
              </div>
              <p className={`text-[9px] mt-0.5 ${isOverCap ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                {totalHours.toFixed(1)}h
              </p>
            </button>
          );
        })}
      </div>

      {/* Selected day items */}
      {selectedDay ? (
        <DaySchedule
          dayName={selectedDay}
          items={itemsByDay[selectedDay] || []}
          canEdit={canEdit}
          onRemoveItem={onRemoveItem}
        />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            Select a day above to view and manage items
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DaySchedule({ dayName, items, canEdit, onRemoveItem }: {
  dayName: DayOfWeek;
  items: WeeklyPlanItem[];
  canEdit: boolean;
  onRemoveItem: (id: string) => void;
}) {
  const amItems = items.filter(i => getTimeBlock(i) === 'AM');
  const pmItems = items.filter(i => getTimeBlock(i) === 'PM');
  const flexItems = items.filter(i => getTimeBlock(i) === 'FLEX');
  const totalHours = items.reduce((s, i) => s + estimateItemHours(i), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{dayName}'s Schedule</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
            {totalHours > 7 && (
              <Badge variant="destructive" className="text-[10px] gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                {totalHours.toFixed(1)}h over cap
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
            No items scheduled — add from suggestions or use Exception Item
          </div>
        ) : (
          <div className="space-y-3">
            <TimeBlockGroup label="☀️ Morning (8:00 AM – 12:00 PM)" items={amItems} canEdit={canEdit} onRemoveItem={onRemoveItem} />
            <TimeBlockGroup label="🌤️ Afternoon (1:00 PM – 5:00 PM)" items={pmItems} canEdit={canEdit} onRemoveItem={onRemoveItem} />
            <TimeBlockGroup label="⏰ Flexible" items={flexItems} canEdit={canEdit} onRemoveItem={onRemoveItem} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
