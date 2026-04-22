import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  MapPin,
  Clock,
  PlayCircle,
  CheckCircle,
  Search,
  Calendar as CalendarIcon,
  AlertTriangle,
  Building2,
  Compass,
  ChevronRight,
} from 'lucide-react';
import { WeeklyPlanItem, InspectionVisitStatus, ItemType } from '@/types/inspectionTypes';
import { inspectionService } from '@/services/inspectionService';
import { violationService } from '@/services/violationService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ACTIONABLE_STATUSES = new Set<InspectionVisitStatus>([
  InspectionVisitStatus.PLANNED,
  InspectionVisitStatus.NOT_STARTED,
  InspectionVisitStatus.IN_PROGRESS,
]);

function startOfWeekISO(d = new Date()): string {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0, 0, 0, 0);
  return dt.toISOString().slice(0, 10);
}

function endOfWeekISO(d = new Date()): string {
  const dt = new Date(startOfWeekISO(d));
  dt.setDate(dt.getDate() + 6);
  return dt.toISOString().slice(0, 10);
}

function statusBadge(status: InspectionVisitStatus) {
  switch (status) {
    case InspectionVisitStatus.COMPLETED:
      return 'bg-success/10 text-success border-success/20';
    case InspectionVisitStatus.IN_PROGRESS:
      return 'bg-warning/10 text-warning border-warning/20';
    case InspectionVisitStatus.RESCHEDULED:
      return 'bg-accent/20 text-accent-foreground border-accent/30';
    case InspectionVisitStatus.NOT_DONE:
    case InspectionVisitStatus.ABORTED:
      return 'bg-destructive/10 text-destructive border-destructive/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export default function FieldExecution() {
  const navigate = useNavigate();
  const [planItems, setPlanItems] = useState<WeeklyPlanItem[]>([]);
  const [activeViolationsCount, setActiveViolationsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
    requestGPSPermission();
  }, []);

  const requestGPSPermission = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        () => {
          toast.error('Unable to get GPS location. Some features may be limited.');
        }
      );
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      // Load this week's items only — keeps the screen actionable
      const weekStart = startOfWeekISO();
      const [items, activeViolations] = await Promise.all([
        inspectionService.getWeeklyPlanItems('', weekStart),
        violationService
          .getAll()
          .then((v) =>
            v.filter((x) =>
              ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'UNDER_REVIEW'].includes(x.status)
            )
          ),
      ]);
      setPlanItems(items);
      setActiveViolationsCount(activeViolations.length);
    } catch (error) {
      toast.error('Failed to load field execution data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = endOfWeekISO();

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return planItems;
    return planItems.filter((i) =>
      [i.employerName, i.areaName, i.focusNotes].some((s) =>
        (s ?? '').toLowerCase().includes(q)
      )
    );
  }, [planItems, search]);

  const todayVisits = useMemo(
    () =>
      filteredItems.filter(
        (item) => item.plannedDate === today && ACTIONABLE_STATUSES.has(item.status)
      ),
    [filteredItems, today]
  );

  const overdueVisits = useMemo(
    () =>
      filteredItems.filter(
        (item) => item.plannedDate < today && ACTIONABLE_STATUSES.has(item.status)
      ),
    [filteredItems, today]
  );

  const upcomingThisWeek = useMemo(
    () =>
      filteredItems
        .filter(
          (item) =>
            item.plannedDate > today &&
            item.plannedDate <= weekEnd &&
            ACTIONABLE_STATUSES.has(item.status)
        )
        .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate)),
    [filteredItems, today, weekEnd]
  );

  const completedThisWeek = useMemo(
    () => filteredItems.filter((item) => item.status === InspectionVisitStatus.COMPLETED),
    [filteredItems]
  );

  const inProgressCount = filteredItems.filter(
    (i) => i.status === InspectionVisitStatus.IN_PROGRESS
  ).length;

  const renderVisitRow = (item: WeeklyPlanItem, opts: { primary?: boolean } = {}) => {
    const isEmployer = item.itemType === ItemType.EMPLOYER_VISIT;
    const Icon = isEmployer ? Building2 : Compass;
    const ctaLabel =
      item.status === InspectionVisitStatus.IN_PROGRESS
        ? 'Continue'
        : item.status === InspectionVisitStatus.COMPLETED
        ? 'View'
        : 'Start Visit';

    return (
      <div
        key={item.id}
        className={cn(
          'border rounded-lg p-4 hover:bg-accent/40 transition-colors flex items-start gap-3',
          opts.primary && 'bg-card shadow-sm'
        )}
      >
        <div
          className={cn(
            'h-10 w-10 rounded-md flex items-center justify-center shrink-0',
            isEmployer ? 'bg-primary/10 text-primary' : 'bg-accent/30 text-accent-foreground'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="outline" className="font-normal">
              {isEmployer ? 'Employer Visit' : 'Scouting'}
            </Badge>
            <Badge className={cn('border', statusBadge(item.status))}>
              {item.status.replace(/_/g, ' ')}
            </Badge>
            {item.plannedDate < today && ACTIONABLE_STATUSES.has(item.status) && (
              <Badge variant="outline" className="border-destructive/30 text-destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Overdue
              </Badge>
            )}
          </div>
          <div className="font-medium truncate">
            {isEmployer ? item.employerName || '—' : item.areaName || '—'}
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap mt-0.5">
            <span className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              {item.plannedDate}
            </span>
            {item.plannedStartTime && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {item.plannedStartTime}
                {item.plannedEndTime ? ` – ${item.plannedEndTime}` : ''}
              </span>
            )}
            {item.territory && <span>· {item.territory}</span>}
          </div>
          {!isEmployer && item.focusNotes && (
            <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {item.focusNotes}
            </div>
          )}
        </div>

        <Button
          size="sm"
          variant={opts.primary ? 'default' : 'outline'}
          onClick={() => navigate(`/compliance/field/audit-visit/${item.id}`)}
          className="shrink-0"
        >
          {item.status === InspectionVisitStatus.COMPLETED ? (
            <>
              <CheckCircle className="h-4 w-4 mr-1.5" />
              {ctaLabel}
            </>
          ) : (
            <>
              <PlayCircle className="h-4 w-4 mr-1.5" />
              {ctaLabel}
            </>
          )}
          <ChevronRight className="h-4 w-4 ml-1 opacity-60" />
        </Button>
      </div>
    );
  };

  const emptyState = (label: string) => (
    <div className="text-center py-10 text-muted-foreground">
      <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
      <p className="text-sm">{label}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Field Execution"
        subtitle="Check in, conduct visits, collect evidence, and record findings"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Weekly Audit Planning', href: '/compliance/audit-planning/my-plans' },
          { label: 'Field Execution' },
        ]}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{todayVisits.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {inProgressCount > 0 ? `${inProgressCount} in progress` : 'visits scheduled'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-3xl font-bold',
                overdueVisits.length > 0 ? 'text-destructive' : 'text-foreground'
              )}
            >
              {overdueVisits.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">past due date</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Active Violations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeViolationsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">across portfolio</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              GPS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MapPin
                className={cn(
                  'h-5 w-5',
                  gpsLocation ? 'text-success' : 'text-warning'
                )}
              />
              <Badge variant={gpsLocation ? 'default' : 'secondary'}>
                {gpsLocation ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {gpsLocation && (
              <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                {gpsLocation.lat.toFixed(4)}, {gpsLocation.lng.toFixed(4)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's primary action panel */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Today's Visits
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employer or area..."
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading
            ? emptyState('Loading...')
            : todayVisits.length === 0
            ? emptyState('No visits scheduled for today')
            : (
              <div className="space-y-3">
                {todayVisits.map((item) => renderVisitRow(item, { primary: true }))}
              </div>
            )}
        </CardContent>
      </Card>

      {/* Other visits — tabbed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Visits This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList>
              <TabsTrigger value="upcoming">
                Upcoming
                <Badge variant="secondary" className="ml-2">
                  {upcomingThisWeek.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="overdue">
                Overdue
                <Badge variant="secondary" className="ml-2">
                  {overdueVisits.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed
                <Badge variant="secondary" className="ml-2">
                  {completedThisWeek.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-4">
              {upcomingThisWeek.length === 0
                ? emptyState('No upcoming visits this week')
                : (
                  <div className="space-y-2">
                    {upcomingThisWeek.map((item) => renderVisitRow(item))}
                  </div>
                )}
            </TabsContent>

            <TabsContent value="overdue" className="mt-4">
              {overdueVisits.length === 0
                ? emptyState('No overdue visits — nicely done!')
                : (
                  <div className="space-y-2">
                    {overdueVisits.map((item) => renderVisitRow(item))}
                  </div>
                )}
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              {completedThisWeek.length === 0
                ? emptyState('No completed visits yet this week')
                : (
                  <div className="space-y-2">
                    {completedThisWeek.map((item) => renderVisitRow(item))}
                  </div>
                )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
