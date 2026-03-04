import { useState, useMemo } from 'react';
import { useProfileNameByUserCode } from '@/hooks/useProfileByUserCode';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { formatDisplayDate, parseDateSafe } from '@/lib/dateFormat';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/date-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMeetings } from '@/hooks/useMeetings';
import { useApplicationNames } from '@/hooks/useApplicationNames';
import { MeetingDetailView } from '@/components/meetings/MeetingDetailView';
import { MeetingActionButtons } from '@/components/meetings/MeetingActionButtons';
import type { Meeting, MeetingStatus, MeetingType, MeetingFilters } from '@/types/meetings';
import {
  Calendar,
  Clock,
  Search,
  Filter,
  X,
  CalendarDays,
  User,
  Building2,
  Eye,
  RefreshCw,
  PlayCircle,
  Layers,
  ChevronDown,
  ChevronRight,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Activity,
  ArrowRight,
} from 'lucide-react';

const statusColors: Record<MeetingStatus, string> = {
  'Scheduled': 'bg-info/10 text-info',
  'Rescheduled': 'bg-warning/15 text-warning',
  'InProgress': 'bg-accent text-accent-foreground',
  'Closed': 'bg-success/10 text-success',
  'Cancelled': 'bg-muted text-muted-foreground',
  'Rejected': 'bg-destructive/10 text-destructive'
};

const statusAccentColors: Record<MeetingStatus, string> = {
  'Scheduled': 'border-l-info',
  'Rescheduled': 'border-l-warning',
  'InProgress': 'border-l-accent',
  'Closed': 'border-l-success',
  'Cancelled': 'border-l-muted-foreground',
  'Rejected': 'border-l-destructive'
};

const meetingTypeLabels: Record<MeetingType, string> = {
  'IP-Registration': 'Insured Person',
  'Employer-Registration': 'Employer',
  'Doctor-Registration': 'Doctor',
  'General': 'General'
};

/** Statuses that mean the meeting group is "done" */
const CLOSED_STATUSES: MeetingStatus[] = ['Closed', 'Cancelled', 'Rejected'];

/** Statuses that mean this individual meeting row is de-emphasised (rescheduled / superseded) */
const DEEMPHASIZED_STATUSES: MeetingStatus[] = ['Rescheduled', 'Cancelled'];

function ContactPersonName({ userCode }: { userCode: string }) {
  const { data: name } = useProfileNameByUserCode(userCode);
  return <>{name || userCode}</>;
}

function MeetingRow({ meeting, onView, onResume, showAppRef = false, deemphasize = false }: {
  meeting: Meeting;
  onView: (id: string) => void;
  onResume: (id: string) => void;
  showAppRef?: boolean;
  deemphasize?: boolean;
}) {
  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      const d = new Date();
      d.setHours(parseInt(hours), parseInt(minutes));
      return format(d, 'h:mm a');
    } catch {
      return time;
    }
  };

  const accentColor = statusAccentColors[meeting.status] || 'border-l-muted';

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 hover:bg-accent/40 transition-all cursor-pointer border-l-4 ${accentColor} ${deemphasize ? 'opacity-50 bg-muted/20' : ''}`}
      onClick={() => onView(meeting.id)}
    >
      <div className="flex items-center gap-4">
        {/* Date block */}
        <div className={`text-center min-w-[52px] ${deemphasize ? '' : ''}`}>
          <p className={`font-bold leading-tight ${deemphasize ? 'text-base text-muted-foreground' : 'text-xl'}`}>
            {format(parseDateSafe(meeting.meeting_date), 'd')}
          </p>
          <p className={`leading-tight ${deemphasize ? 'text-[10px] text-muted-foreground' : 'text-xs text-muted-foreground'}`}>
            {format(parseDateSafe(meeting.meeting_date), 'MMM yyyy')}
          </p>
        </div>

        {/* Divider */}
        <div className={`w-px self-stretch ${deemphasize ? 'bg-border/50' : 'bg-border'}`} />

        {/* Meeting details */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold ${deemphasize ? 'text-xs text-muted-foreground' : 'text-sm'}`}>
              {meeting.meeting_reference}
            </span>
            <Badge className={`${statusColors[meeting.status]} ${deemphasize ? 'text-[10px] px-1.5 py-0' : 'text-xs'}`} variant="secondary">
              {meeting.status}
            </Badge>
            {!deemphasize && (
              <Badge variant="outline" className="text-xs font-normal">
                {meetingTypeLabels[meeting.meeting_type]}
              </Badge>
            )}
          </div>
          {showAppRef && (
            <p className={`text-muted-foreground ${deemphasize ? 'text-[10px]' : 'text-sm'}`}>
              Application: {meeting.application_reference}
            </p>
          )}
          <div className={`flex items-center gap-3 text-muted-foreground ${deemphasize ? 'text-[10px]' : 'text-xs'}`}>
            <span className="flex items-center gap-1">
              <Clock className={deemphasize ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
              {formatTime(meeting.meeting_time)}
            </span>
            {meeting.contact_person && !deemphasize && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <ContactPersonName userCode={meeting.contact_person} />
              </span>
            )}
            {meeting.workflow_definitions?.name && !deemphasize && (
              <span className="flex items-center gap-1 hidden sm:flex">
                <Building2 className="h-3 w-3" />
                <span className="truncate max-w-[180px]">{meeting.workflow_definitions.name}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {meeting.status === 'InProgress' && !deemphasize && (
          <Button
            variant="default"
            size="sm"
            className="gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              onResume(meeting.id);
            }}
          >
            <PlayCircle className="h-3.5 w-3.5" />
            Resume
          </Button>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>View Details</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

/** Determine the "active" meeting date for a group — uses the latest Scheduled/InProgress meeting date */
function getActiveDate(meetings: Meeting[]): string {
  const active = meetings
    .filter(m => m.status === 'Scheduled' || m.status === 'InProgress')
    .sort((a, b) => b.meeting_date.localeCompare(a.meeting_date));
  if (active.length) return active[0].meeting_date;
  return meetings.reduce((max, m) => m.meeting_date > max ? m.meeting_date : max, '');
}

/** Get the primary status for a group */
function getGroupPrimaryStatus(meetings: Meeting[]): MeetingStatus {
  const active = meetings.find(m => m.status === 'InProgress');
  if (active) return 'InProgress';
  const scheduled = meetings.find(m => m.status === 'Scheduled');
  if (scheduled) return 'Scheduled';
  const latest = [...meetings].sort((a, b) => (b.reschedule_count || 0) - (a.reschedule_count || 0))[0];
  return latest?.status || 'Scheduled';
}

/** Check if a group is fully closed/done */
function isGroupClosed(meetings: Meeting[]): boolean {
  const latest = [...meetings].sort((a, b) => (b.reschedule_count || 0) - (a.reschedule_count || 0))[0];
  return latest ? CLOSED_STATUSES.includes(latest.status) : false;
}

/** Stat card component */
function StatCard({ label, value, icon: Icon, color, active, onClick }: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:shadow-md w-full ${
        active ? 'ring-2 ring-primary shadow-md bg-primary/5' : 'bg-card hover:bg-accent/30'
      }`}
    >
      <div className={`rounded-lg p-2.5 ${color}`}>
        <Icon className="h-5 w-5 text-primary-foreground" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </button>
  );
}

export default function ManageMeetingsPage() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<MeetingFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [dateRangeKey, setDateRangeKey] = useState<string>('all');

  const { data: meetings, isLoading, refetch } = useMeetings({
    ...filters,
    applicationReference: searchTerm || undefined,
    meetingReference: searchTerm || undefined
  });

  // Collect unique application references for name lookup
  const appRefs = useMemo(() => {
    if (!meetings) return [];
    return [...new Set(meetings.map(m => m.application_reference))];
  }, [meetings]);

  const { data: appNames } = useApplicationNames(appRefs);

  // Compute stats
  const stats = useMemo(() => {
    if (!meetings) return { total: 0, scheduled: 0, inProgress: 0, closed: 0 };
    return {
      total: meetings.length,
      scheduled: meetings.filter(m => m.status === 'Scheduled').length,
      inProgress: meetings.filter(m => m.status === 'InProgress').length,
      closed: meetings.filter(m => CLOSED_STATUSES.includes(m.status)).length,
    };
  }, [meetings]);

  // Sort meetings by date and time
  const sortedMeetings = useMemo(() => {
    if (!meetings) return [];
    return [...meetings].sort((a, b) => {
      const dateCmp = a.meeting_date.localeCompare(b.meeting_date);
      if (dateCmp !== 0) return dateCmp;
      return (a.meeting_time || '').localeCompare(b.meeting_time || '');
    });
  }, [meetings]);

  // Group meetings by application reference
  const { activeGroups, closedGroups } = useMemo(() => {
    if (!sortedMeetings.length) return { activeGroups: [], closedGroups: [] };

    const groups: Record<string, Meeting[]> = {};
    for (const m of sortedMeetings) {
      const key = m.application_reference;
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }

    const allGroups = Object.entries(groups);
    const active: [string, Meeting[]][] = [];
    const closed: [string, Meeting[]][] = [];

    for (const group of allGroups) {
      if (isGroupClosed(group[1])) {
        closed.push(group);
      } else {
        active.push(group);
      }
    }

    const sortFn = (a: [string, Meeting[]], b: [string, Meeting[]]) => {
      return getActiveDate(b[1]).localeCompare(getActiveDate(a[1]));
    };

    active.sort(sortFn);
    closed.sort(sortFn);

    return { activeGroups: active, closedGroups: closed };
  }, [sortedMeetings]);

  const toggleGroupCollapse = (appRef: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(appRef)) next.delete(appRef); else next.add(appRef);
      return next;
    });
  };

  const handleFilterChange = (key: keyof MeetingFilters, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setFilters(prev => ({ ...prev, dateFrom: date ? format(date, 'yyyy-MM-dd') : undefined }));
  };

  const handleDateToChange = (date: Date | undefined) => {
    setFilters(prev => ({ ...prev, dateTo: date ? format(date, 'yyyy-MM-dd') : undefined }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setDateRangeKey('all');
  };

  const setDateRange = (key: string) => {
    setDateRangeKey(key);
    const today = new Date();
    switch (key) {
      case 'today':
        setFilters(prev => ({ ...prev, dateFrom: format(today, 'yyyy-MM-dd'), dateTo: format(today, 'yyyy-MM-dd') }));
        break;
      case 'week': {
        const ws = startOfWeek(today, { weekStartsOn: 1 });
        const we = endOfWeek(today, { weekStartsOn: 1 });
        setFilters(prev => ({ ...prev, dateFrom: format(ws, 'yyyy-MM-dd'), dateTo: format(we, 'yyyy-MM-dd') }));
        break;
      }
      case 'month': {
        const ms = startOfMonth(today);
        const me = endOfMonth(today);
        setFilters(prev => ({ ...prev, dateFrom: format(ms, 'yyyy-MM-dd'), dateTo: format(me, 'yyyy-MM-dd') }));
        break;
      }
      case 'upcoming': {
        setFilters(prev => ({ ...prev, dateFrom: format(today, 'yyyy-MM-dd'), dateTo: format(addDays(today, 30), 'yyyy-MM-dd') }));
        break;
      }
      default:
        setFilters(prev => ({ ...prev, dateFrom: undefined, dateTo: undefined }));
    }
  };

  const openMeetingDetail = (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    setDetailDialogOpen(true);
  };

  const renderGroupedList = (groups: [string, Meeting[]][], isClosed: boolean) => {
    if (!groups.length) {
      return (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="h-14 w-14 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No {isClosed ? 'closed' : 'active'} meetings</p>
          <p className="text-sm mt-1">
            {isClosed ? 'Completed meetings will appear here' : 'No upcoming meetings match your filters'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {groups.map(([appRef, groupMeetings]) => {
          const activeDate = getActiveDate(groupMeetings);
          const applicantName = appNames?.[appRef];
          const groupIsClosed = isClosed;
          const primaryStatus = getGroupPrimaryStatus(groupMeetings);
          const isCollapsed = collapsedGroups.has(appRef);
          const activeMeetingCount = groupMeetings.filter(m => !DEEMPHASIZED_STATUSES.includes(m.status)).length;
          const totalCount = groupMeetings.length;
          const accentBorder = statusAccentColors[primaryStatus] || 'border-l-muted';

          return (
            <div
              key={appRef}
              className={`rounded-xl border overflow-hidden transition-all shadow-sm hover:shadow-md ${
                groupIsClosed ? 'opacity-60 border-muted/60' : 'border-border'
              }`}
            >
              {/* Group Header */}
              <button
                onClick={() => toggleGroupCollapse(appRef)}
                className={`w-full px-4 py-3.5 flex items-center justify-between border-l-4 ${accentBorder} transition-colors ${
                  groupIsClosed
                    ? 'bg-muted/20 hover:bg-muted/30'
                    : 'bg-gradient-to-r from-muted/60 to-muted/30 hover:from-muted/80 hover:to-muted/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold text-sm ${groupIsClosed ? 'text-muted-foreground' : ''}`}>
                        {appRef}
                      </span>
                      {applicantName && (
                        <>
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className={`font-medium text-sm truncate ${groupIsClosed ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {applicantName}
                          </span>
                        </>
                      )}
                    </div>
                    {totalCount > 1 && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {activeMeetingCount} active · {totalCount - activeMeetingCount} rescheduled/closed
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge className={`${statusColors[primaryStatus]} text-[11px]`} variant="secondary">
                    {primaryStatus}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>{formatDisplayDate(activeDate)}</span>
                  </div>
                </div>
              </button>

              {/* Meeting Rows (collapsible) */}
              {!isCollapsed && (
                <div className={`divide-y divide-border/50 ${groupIsClosed ? 'bg-muted/5' : 'bg-card'}`}>
                  {groupMeetings.map((meeting) => {
                    const isDeemphasized = DEEMPHASIZED_STATUSES.includes(meeting.status);
                    return (
                      <MeetingRow
                        key={meeting.id}
                        meeting={meeting}
                        onView={openMeetingDetail}
                        onResume={(id) => navigate(`/meetings/start/${id}`)}
                        deemphasize={isDeemphasized}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Meetings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage scheduled meetings across all workflows
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {!isLoading && meetings && meetings.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total Meetings"
            value={stats.total}
            icon={CalendarDays}
            color="bg-muted-foreground"
            active={!filters.status}
            onClick={() => handleFilterChange('status', 'all')}
          />
          <StatCard
            label="Scheduled"
            value={stats.scheduled}
            icon={CalendarCheck}
            color="bg-info"
            active={filters.status === 'Scheduled'}
            onClick={() => handleFilterChange('status', filters.status === 'Scheduled' ? 'all' : 'Scheduled')}
          />
          <StatCard
            label="In Progress"
            value={stats.inProgress}
            icon={Activity}
            color="bg-accent"
            active={filters.status === 'InProgress'}
            onClick={() => handleFilterChange('status', filters.status === 'InProgress' ? 'all' : 'InProgress')}
          />
          <StatCard
            label="Closed / Done"
            value={stats.closed}
            icon={CheckCircle2}
            color="bg-success"
            active={filters.status === 'Closed'}
            onClick={() => handleFilterChange('status', filters.status === 'Closed' ? 'all' : 'Closed')}
          />
        </div>
      )}

      {/* Quick Date Range & Filters Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'today', 'week', 'month', 'upcoming'].map((key) => {
            const labels: Record<string, string> = {
              all: 'All Dates',
              today: 'Today',
              week: 'This Week',
              month: 'This Month',
              upcoming: 'Next 30 Days'
            };
            return (
              <Button
                key={key}
                variant={dateRangeKey === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange(key)}
                className="text-xs"
              >
                {labels[key]}
              </Button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 w-[200px] text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-xs gap-1.5"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
          </Button>
          {(searchTerm || filters.status || filters.meetingType) && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1 text-destructive">
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <Card className="border-dashed">
          <CardContent className="pt-4 pb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Select
              value={filters.status || 'all'}
              onValueChange={(v) => handleFilterChange('status', v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="Rescheduled">Rescheduled</SelectItem>
                <SelectItem value="InProgress">In Progress</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.meetingType || 'all'}
              onValueChange={(v) => handleFilterChange('meetingType', v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="IP-Registration">Insured Person</SelectItem>
                <SelectItem value="Employer-Registration">Employer</SelectItem>
                <SelectItem value="Doctor-Registration">Doctor</SelectItem>
                <SelectItem value="General">General</SelectItem>
              </SelectContent>
            </Select>

            <DatePicker
              date={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
              onDateChange={handleDateFromChange}
              placeholder="From date"
            />
            <DatePicker
              date={filters.dateTo ? new Date(filters.dateTo) : undefined}
              onDateChange={handleDateToChange}
              placeholder="To date"
            />
          </CardContent>
        </Card>
      )}

      {/* Meetings List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : !sortedMeetings.length ? (
        <Card className="border-dashed">
          <CardContent className="py-16">
            <div className="text-center text-muted-foreground">
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No meetings found</p>
              <p className="text-sm mt-1">Try adjusting your date range or filters</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                Clear all filters
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="active" className="gap-2">
              <CalendarClock className="h-4 w-4" />
              Active / Scheduled
              {activeGroups.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{activeGroups.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="closed" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Closed / Done
              {closedGroups.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{closedGroups.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            {renderGroupedList(activeGroups, false)}
          </TabsContent>
          <TabsContent value="closed">
            {renderGroupedList(closedGroups, true)}
          </TabsContent>
        </Tabs>
      )}

      {/* Meeting Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedMeetingId && (
            <MeetingDetailView
              meetingId={selectedMeetingId}
              onClose={() => setDetailDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
