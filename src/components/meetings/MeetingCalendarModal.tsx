import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  FileText,
  CalendarDays,
  Filter,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMeetingCalendar, CalendarMeeting } from '@/hooks/useMeetingCalendar';
import { formatDisplayDate } from '@/lib/dateFormat';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  isSunday,
} from 'date-fns';

interface MeetingCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  Scheduled: {
    label: 'Scheduled',
    dot: 'bg-government-600',
    badge: 'bg-government-50 text-government-800 border-government-200',
  },
  Rescheduled: {
    label: 'Rescheduled',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  InProgress: {
    label: 'In Progress',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  Closed: {
    label: 'Closed',
    dot: 'bg-muted-foreground',
    badge: 'bg-muted text-muted-foreground border-border',
  },
  Cancelled: {
    label: 'Cancelled',
    dot: 'bg-destructive',
    badge: 'bg-red-50 text-red-700 border-red-200',
  },
  Rejected: {
    label: 'Rejected',
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

const FILTER_STATUSES = ['Scheduled', 'InProgress', 'Rescheduled', 'Closed', 'Cancelled'];

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MeetingCalendarModal({ open, onOpenChange }: MeetingCalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const { meetingsByDate, isLoading, error } = useMeetingCalendar(currentMonth);

  const prevMonth = () => setCurrentMonth(m => subMonths(m, 1));
  const nextMonth = () => setCurrentMonth(m => addMonths(m, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const toggleFilter = (status: string) => {
    setActiveFilters(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const clearFilters = () => setActiveFilters([]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  // Filter meetings by active status filters
  const filteredMeetingsByDate = useMemo(() => {
    if (activeFilters.length === 0) return meetingsByDate;
    const filtered: Record<string, CalendarMeeting[]> = {};
    for (const [date, meetings] of Object.entries(meetingsByDate)) {
      const matched = meetings.filter(m => activeFilters.includes(m.status));
      if (matched.length > 0) filtered[date] = matched;
    }
    return filtered;
  }, [meetingsByDate, activeFilters]);

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const selectedMeetings = selectedDateStr ? (filteredMeetingsByDate[selectedDateStr] || []) : [];

  // Total meeting count for month
  const totalMonthMeetings = useMemo(() => {
    return Object.values(filteredMeetingsByDate).reduce((sum, arr) => sum + arr.length, 0);
  }, [filteredMeetingsByDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[92vh] p-0 gap-0 overflow-hidden rounded-xl border-border shadow-xl">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold text-foreground">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-government-600 text-white">
                <CalendarDays className="h-4 w-4" />
              </div>
              My Meeting Calendar
            </DialogTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium tabular-nums">{totalMonthMeetings}</span>
              <span>meeting{totalMonthMeetings !== 1 ? 's' : ''} this month</span>
            </div>
          </div>
        </DialogHeader>

        {/* Filter Bar */}
        <div className="px-6 py-3 border-b border-border bg-muted/30 flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground font-medium mr-1">Filter:</span>
          {FILTER_STATUSES.map(status => {
            const config = STATUS_CONFIG[status] || STATUS_CONFIG.Scheduled;
            const isActive = activeFilters.includes(status);
            return (
              <button
                key={status}
                onClick={() => toggleFilter(status)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150',
                  isActive
                    ? config.badge + ' ring-1 ring-offset-1 ring-primary/30'
                    : 'bg-background text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
                )}
                aria-pressed={isActive}
              >
                <span className={cn('w-2 h-2 rounded-full shrink-0', config.dot)} />
                {config.label}
              </button>
            );
          })}
          {activeFilters.length > 0 && (
            <button
              onClick={clearFilters}
              className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear all filters"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>

        {/* Main Body */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Calendar Grid */}
          <div className="flex-1 p-5 min-w-0 overflow-y-auto">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                size="icon"
                onClick={prevMonth}
                className="h-8 w-8 rounded-lg"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-foreground tracking-tight">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-3 rounded-md font-medium"
                  onClick={goToToday}
                >
                  Today
                </Button>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={nextMonth}
                className="h-8 w-8 rounded-lg"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_HEADERS.map(d => (
                <div
                  key={d}
                  className={cn(
                    'text-center text-[11px] font-semibold uppercase tracking-wider py-2',
                    d === 'Sun' ? 'text-destructive/60' : 'text-muted-foreground'
                  )}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day Cells */}
            {isLoading ? (
              <CalendarSkeleton />
            ) : (
              <TooltipProvider delayDuration={300}>
                <div className="grid grid-cols-7 border border-border rounded-lg overflow-hidden">
                  {calendarDays.map((day, idx) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayMeetings = filteredMeetingsByDate[dateStr] || [];
                    const hasMeetings = dayMeetings.length > 0;
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isTodayDate = isToday(day);
                    const isSun = isSunday(day);

                    const cell = (
                      <button
                        key={idx}
                        onClick={() => setSelectedDate(day)}
                        aria-label={`${format(day, 'MMMM d, yyyy')}${hasMeetings ? `, ${dayMeetings.length} meeting${dayMeetings.length > 1 ? 's' : ''}` : ''}`}
                        aria-selected={!!isSelected}
                        className={cn(
                          'relative flex flex-col items-center justify-start p-1.5 min-h-[56px] text-sm transition-all duration-150 border-b border-r border-border/50 bg-card',
                          'hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                          !isCurrentMonth && 'bg-muted/20',
                          isSun && isCurrentMonth && 'bg-destructive/[0.03]',
                          isSelected && 'bg-primary/8 ring-2 ring-inset ring-primary shadow-sm',
                          isTodayDate && !isSelected && 'bg-primary/5'
                        )}
                      >
                        <span
                          className={cn(
                            'flex items-center justify-center w-6 h-6 rounded-full text-xs leading-none transition-colors',
                            !isCurrentMonth && 'text-muted-foreground/30',
                            isCurrentMonth && !isTodayDate && !isSelected && 'text-foreground',
                            isSun && isCurrentMonth && !isTodayDate && !isSelected && 'text-destructive/50',
                            isTodayDate && 'bg-primary text-primary-foreground font-bold',
                            isSelected && !isTodayDate && 'font-semibold text-primary'
                          )}
                        >
                          {format(day, 'd')}
                        </span>
                        {hasMeetings && isCurrentMonth && (
                          <div className="flex gap-[3px] mt-0.5 flex-wrap justify-center max-w-full">
                            {dayMeetings.slice(0, 3).map((m, i) => {
                              const cfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.Scheduled;
                              return (
                                <span
                                  key={i}
                                  className={cn('w-[6px] h-[6px] rounded-full', cfg.dot)}
                                />
                              );
                            })}
                            {dayMeetings.length > 3 && (
                              <span className="text-[8px] font-semibold text-muted-foreground leading-none mt-px">
                                +{dayMeetings.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );

                    // Wrap cells with meetings in a tooltip
                    if (hasMeetings && isCurrentMonth) {
                      return (
                        <Tooltip key={idx}>
                          <TooltipTrigger asChild>{cell}</TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            className="max-w-[220px] p-2.5"
                          >
                            <p className="text-xs font-semibold mb-1.5">
                              {format(day, 'EEE, MMM d')} · {dayMeetings.length} meeting{dayMeetings.length > 1 ? 's' : ''}
                            </p>
                            <div className="space-y-1">
                              {dayMeetings.slice(0, 3).map((m, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-[11px]">
                                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', (STATUS_CONFIG[m.status] || STATUS_CONFIG.Scheduled).dot)} />
                                  <span className="truncate">{m.meeting_reference}</span>
                                  <span className="text-muted-foreground ml-auto shrink-0">{m.meeting_time?.slice(0, 5)}</span>
                                </div>
                              ))}
                              {dayMeetings.length > 3 && (
                                <p className="text-[10px] text-muted-foreground">+{dayMeetings.length - 3} more</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return cell;
                  })}
                </div>
              </TooltipProvider>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive mt-4 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                <span>⚠</span>
                <span>Failed to load meetings. Please try again.</span>
              </div>
            )}
          </div>

          {/* Detail Side Panel */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border bg-muted/10 flex flex-col min-h-0">
            {/* Panel Header */}
            <div className="px-5 py-4 border-b border-border bg-card">
              <h4 className="text-sm font-semibold text-foreground">
                {selectedDate
                  ? format(selectedDate, 'EEEE, MMMM d')
                  : 'Meeting Details'}
              </h4>
              {selectedDate && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedMeetings.length === 0
                    ? 'No meetings'
                    : `${selectedMeetings.length} meeting${selectedMeetings.length !== 1 ? 's' : ''} scheduled`}
                </p>
              )}
            </div>

            {/* Panel Content */}
            <ScrollArea className="flex-1 max-h-[400px] md:max-h-none">
              <div className="p-4 space-y-3">
                {!selectedDate && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Select a date</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Click on any date to view meetings</p>
                  </div>
                )}

                {selectedDate && selectedMeetings.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <CalendarDays className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">No meetings scheduled</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {activeFilters.length > 0 ? 'Try clearing filters' : 'This day is free'}
                    </p>
                  </div>
                )}

                {selectedMeetings.map(meeting => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Skeleton Loader ---------- */
function CalendarSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-px border border-border rounded-lg overflow-hidden">
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} className="min-h-[56px] p-2 bg-card border-b border-r border-border/50">
          <Skeleton className="w-5 h-5 rounded-full mx-auto" />
          {i % 4 === 0 && <Skeleton className="w-8 h-1.5 rounded-full mx-auto mt-2" />}
        </div>
      ))}
    </div>
  );
}

/* ---------- Meeting Card ---------- */
function MeetingCard({ meeting }: { meeting: CalendarMeeting }) {
  const config = STATUS_CONFIG[meeting.status] || STATUS_CONFIG.Scheduled;
  const applicantName = meeting.metadata?.applicantName || meeting.metadata?.applicant_name || null;

  return (
    <div className="rounded-lg border border-border bg-card p-3.5 space-y-2.5 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate leading-tight">
            {meeting.meeting_reference}
          </p>
          {applicantName && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{applicantName}</p>
          )}
        </div>
        <Badge
          variant="outline"
          className={cn('text-[10px] shrink-0 border font-semibold px-2 py-0.5', config.badge)}
        >
          {config.label}
        </Badge>
      </div>

      {/* Details */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-government-500 shrink-0" />
          <span className="font-medium">
            {meeting.meeting_time?.slice(0, 5)}
            {meeting.meeting_end_time && ` – ${meeting.meeting_end_time.slice(0, 5)}`}
          </span>
        </div>

        {meeting.office_address && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-government-500 shrink-0" />
            <span className="truncate">{meeting.office_address}</span>
          </div>
        )}

        {meeting.remarks && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5 text-government-500 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{meeting.remarks}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-2 border-t border-border">
        <span className="font-medium">{meeting.meeting_type}</span>
        <span className="text-border">•</span>
        <span className="truncate">{meeting.application_reference}</span>
      </div>
    </div>
  );
}
