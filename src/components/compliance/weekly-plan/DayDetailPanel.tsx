import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { WeeklyPlanItem } from '@/types/weeklyPlan';
import { DayOfWeek } from '@/hooks/useWeeklyPlanBuilder';
import { MapPin, Clock, AlertTriangle, Building2, Phone, Binoculars } from 'lucide-react';

interface DayDetailPanelProps {
  selectedDay: DayOfWeek | null;
  items: WeeklyPlanItem[];
  dateLabel: string;
}

const MAX_HOURS = 8;

function estimateItemHours(item: WeeklyPlanItem): number {
  if (item.duration === 'FULL_DAY') return 7;
  if (item.duration === 'HALF_DAY_AM' || item.duration === 'HALF_DAY_PM') return 3.5;
  if (item.duration === 'SHORT') return 1;
  switch (item.item_type) {
    case 'EMPLOYER_VISIT': return 2;
    case 'SCOUTING': return 3;
    case 'CALL': return 0.5;
    case 'DESK_REVIEW': return 1.5;
    default: return 1.5;
  }
}

export function DayDetailPanel({ selectedDay, items, dateLabel }: DayDetailPanelProps) {
  if (!selectedDay) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          Click a day to view details
        </CardContent>
      </Card>
    );
  }

  const totalHours = items.reduce((s, i) => s + estimateItemHours(i), 0);
  const usagePercent = Math.min(100, (totalHours / MAX_HOURS) * 100);
  const isOverCapacity = totalHours > MAX_HOURS;

  // Group by territory
  const territories: Record<string, WeeklyPlanItem[]> = {};
  items.forEach(item => {
    const t = item.territory || 'Unassigned';
    if (!territories[t]) territories[t] = [];
    territories[t].push(item);
  });

  // Count by type
  const visits = items.filter(i => i.item_type === 'EMPLOYER_VISIT').length;
  const calls = items.filter(i => i.item_type === 'CALL').length;
  const scouting = items.filter(i => i.item_type === 'SCOUTING').length;
  const mandatory = items.filter(i => i.is_mandatory).length;

  // Items by time block
  const amItems = items.filter(i => i.duration === 'HALF_DAY_AM' || (!i.duration && i.scheduled_start_time && i.scheduled_start_time < '12:00'));
  const pmItems = items.filter(i => i.duration === 'HALF_DAY_PM' || (!i.duration && i.scheduled_start_time && i.scheduled_start_time >= '12:00'));
  const flexItems = items.filter(i => !amItems.includes(i) && !pmItems.includes(i));

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{selectedDay}</span>
          <span className="text-xs text-muted-foreground font-normal">{dateLabel}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Capacity */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Capacity</span>
            <span className={`text-xs font-medium ${isOverCapacity ? 'text-destructive' : ''}`}>
              {totalHours.toFixed(1)}h / {MAX_HOURS}h
            </span>
          </div>
          <Progress value={usagePercent} className={`h-2 ${isOverCapacity ? '[&>div]:bg-destructive' : ''}`} />
          {isOverCapacity && (
            <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
              <AlertTriangle className="h-3 w-3" />
              Over capacity by {(totalHours - MAX_HOURS).toFixed(1)}h
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{visits} visits</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{calls} calls</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Binoculars className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{scouting} scouting</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span>{mandatory} mandatory</span>
          </div>
        </div>

        {/* Time blocks */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Time Blocks</p>
          {[
            { label: 'Morning (AM)', items: amItems, hours: '08:00–12:00' },
            { label: 'Afternoon (PM)', items: pmItems, hours: '13:00–17:00' },
            { label: 'Flexible', items: flexItems, hours: 'Anytime' },
          ].map(block => (
            <div key={block.label} className="bg-muted/30 rounded-md p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{block.label}</span>
                <span className="text-[10px] text-muted-foreground">{block.hours}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {block.items.length} {block.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          ))}
        </div>

        {/* Territory grouping */}
        {Object.keys(territories).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">By Territory</p>
            {Object.entries(territories).map(([territory, tItems]) => (
              <div key={territory} className="flex items-center justify-between bg-muted/30 rounded-md p-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs">{territory}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {tItems.length}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
