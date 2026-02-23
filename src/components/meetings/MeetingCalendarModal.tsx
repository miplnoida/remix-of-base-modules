import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  Play,
  RefreshCw,
  XCircle,
  Loader2,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMeetingCalendar, CalendarMeeting } from '@/hooks/useMeetingCalendar';
import { useStartMeeting } from '@/hooks/useMeetings';
import { CancelMeetingDialog } from './CancelMeetingDialog';
import { RescheduleMeetingDialog } from './RescheduleMeetingDialog';
import {
  format,
  startOfMonth,
  startOfWeek,
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
const FIXED_WEEKS = 5;
const FIXED_CELLS = FIXED_WEEKS * 7;

export function MeetingCalendarModal({ open, onOpenChange }: MeetingCalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const { meetingsByDate, isLoading, error, isAdmin } = useMeetingCalendar(currentMonth);

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

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const days: Date[] = [];
    for (let i = 0; i < FIXED_CELLS; i++) {
      days.push(addDays(calStart, i));
    }
    return days;
  }, [currentMonth]);

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

  const totalMonthMeetings = useMemo(() => {
    return Object.values(filteredMeetingsByDate).reduce((sum, arr) => sum + arr.length, 0);
  }, [filteredMeetingsByDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[96vw] p-0 gap-0 overflow-hidden rounded-xl border-border shadow-xl flex flex-col" style={{ maxHeight: '92vh' }}>
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold text-foreground">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-government-600 text-white">
                <CalendarDays className="h-4 w-4" />
              </div>
              {isAdmin ? 'All Meetings Calendar' : 'My Meeting Calendar'}
            </DialogTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium tabular-nums">{totalMonthMeetings}</span>
              <span>meeting{totalMonthMeetings !== 1 ? 's' : ''} this month</span>
            </div>
          </div>
        </DialogHeader>

        {/* Filter Bar */}
        <div className="px-6 py-3 border-b border-border bg-muted/30 flex items-center gap-2 flex-wrap shrink-0">
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
          <div className="flex-1 p-5 min-w-0 flex flex-col shrink-0">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8 rounded-lg" aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-foreground tracking-tight">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <Button variant="outline" size="sm" className="text-xs h-7 px-3 rounded-md font-medium" onClick={goToToday}>
                  Today
                </Button>
              </div>
              <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8 rounded-lg" aria-label="Next month">
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
                <div className="grid grid-cols-7 grid-rows-5 border border-border rounded-lg overflow-hidden">
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
                          'relative flex flex-col items-center justify-start p-1.5 h-[52px] text-sm transition-all duration-150 border-b border-r border-border/50 bg-card',
                          'hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                          !isCurrentMonth && 'bg-muted/20',
                          isSun && isCurrentMonth && 'bg-destructive/[0.03]',
                          isSelected && 'bg-muted/60 ring-2 ring-inset ring-primary/60',
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
                            isSelected && !isTodayDate && 'font-bold text-foreground'
                          )}
                        >
                          {format(day, 'd')}
                        </span>
                        {hasMeetings && isCurrentMonth && (
                          <div className="flex gap-[3px] mt-0.5 flex-wrap justify-center max-w-full">
                            {dayMeetings.slice(0, 3).map((m, i) => {
                              const cfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.Scheduled;
                              return <span key={i} className={cn('w-[6px] h-[6px] rounded-full', cfg.dot)} />;
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

                    if (hasMeetings && isCurrentMonth) {
                      return (
                        <Tooltip key={idx}>
                          <TooltipTrigger asChild>{cell}</TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[220px] p-2.5">
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
          <div className="w-full md:w-[340px] border-t md:border-t-0 md:border-l border-border bg-muted/10 flex flex-col min-h-0 overflow-hidden">
            {/* Panel Header */}
            <div className="px-5 py-4 border-b border-border bg-card shrink-0">
              <h4 className="text-sm font-semibold text-foreground">
                {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Meeting Details'}
              </h4>
              {selectedDate && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedMeetings.length === 0
                    ? 'No meetings'
                    : `${selectedMeetings.length} meeting${selectedMeetings.length !== 1 ? 's' : ''} scheduled`}
                </p>
              )}
            </div>

            {/* Panel Content - scrollable with fixed max height */}
            <ScrollArea className="flex-1" style={{ maxHeight: 'calc(92vh - 220px)' }}>
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
                  <MeetingCard key={meeting.id} meeting={meeting} isAdmin={isAdmin} onActionComplete={() => {}} />
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
    <div className="grid grid-cols-7 grid-rows-5 gap-px border border-border rounded-lg overflow-hidden">
      {Array.from({ length: FIXED_CELLS }).map((_, i) => (
        <div key={i} className="h-[52px] p-2 bg-card border-b border-r border-border/50">
          <Skeleton className="w-5 h-5 rounded-full mx-auto" />
          {i % 4 === 0 && <Skeleton className="w-8 h-1.5 rounded-full mx-auto mt-2" />}
        </div>
      ))}
    </div>
  );
}

/* ---------- Meeting Card with Confirmation Actions ---------- */
function MeetingCard({
  meeting,
  isAdmin,
  onActionComplete,
}: {
  meeting: CalendarMeeting;
  isAdmin: boolean;
  onActionComplete: () => void;
}) {
  const navigate = useNavigate();
  const config = STATUS_CONFIG[meeting.status] || STATUS_CONFIG.Scheduled;
  const applicantName = meeting.metadata?.applicantName || meeting.metadata?.applicant_name || null;
  const attendeeName = meeting.contact_person_name || meeting.metadata?.contact_person_name || null;

  const startMutation = useStartMeeting();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [startConfirmOpen, setStartConfirmOpen] = useState(false);

  const isActionable = meeting.status === 'Scheduled';

  const handleStartConfirmed = async () => {
    setStartConfirmOpen(false);
    try {
      const result = await startMutation.mutateAsync({ meetingId: meeting.id });
      const targetId = result?.meeting_id || meeting.id;
      navigate(`/meetings/start/${targetId}`);
    } catch (err) {
      console.error('Failed to start meeting:', err);
    }
  };

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow duration-200">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-foreground truncate leading-tight">
              {meeting.meeting_reference}
            </p>
            {applicantName && (
              <p className="text-xs text-muted-foreground truncate mt-1">
                <span className="font-medium">Applicant:</span> {applicantName}
              </p>
            )}
            {isAdmin && attendeeName && (
              <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                <User className="h-3 w-3 shrink-0" />
                <span className="font-medium">Attendee:</span> {attendeeName}
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn('text-[11px] shrink-0 border font-semibold px-2.5 py-0.5', config.badge)}
          >
            {config.label}
          </Badge>
        </div>

        {/* Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Clock className="h-4 w-4 text-government-500 shrink-0" />
            <span className="font-medium">
              {meeting.meeting_time?.slice(0, 5)}
              {meeting.meeting_end_time && ` – ${meeting.meeting_end_time.slice(0, 5)}`}
            </span>
          </div>

          {meeting.office_address && (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <MapPin className="h-4 w-4 text-government-500 shrink-0" />
              <span className="truncate">{meeting.office_address}</span>
            </div>
          )}

          {meeting.remarks && (
            <div className="flex items-start gap-2 text-[13px] text-muted-foreground">
              <FileText className="h-4 w-4 text-government-500 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{meeting.remarks}</span>
            </div>
          )}
        </div>

        {/* Footer + Actions */}
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-border">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground min-w-0">
            <span className="font-medium shrink-0">{meeting.meeting_type}</span>
            <span className="text-border">•</span>
            <span className="truncate">{meeting.application_reference}</span>
          </div>

          {isActionable && (
            <div className="flex items-center gap-1.5 shrink-0">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setStartConfirmOpen(true)}
                      disabled={startMutation.isPending}
                      className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-50"
                      aria-label="Start meeting"
                    >
                      {startMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top"><p className="text-xs">Start</p></TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setRescheduleOpen(true)}
                      className="p-1.5 rounded-md hover:bg-amber-50 text-amber-600 hover:text-amber-700 transition-colors"
                      aria-label="Reschedule meeting"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top"><p className="text-xs">Reschedule</p></TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setCancelOpen(true)}
                      className="p-1.5 rounded-md hover:bg-red-50 text-destructive hover:text-red-700 transition-colors"
                      aria-label="Cancel meeting"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top"><p className="text-xs">Cancel</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </div>

      {/* Start Meeting Confirmation */}
      <AlertDialog open={startConfirmOpen} onOpenChange={setStartConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-emerald-600" />
              Start Meeting
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Are you sure you want to start this meeting?</p>
                <div className="rounded-md bg-muted/50 p-3 space-y-1 text-xs">
                  <p><span className="font-medium text-foreground">Meeting:</span> {meeting.meeting_reference}</p>
                  <p><span className="font-medium text-foreground">Date:</span> {meeting.meeting_date}</p>
                  <p><span className="font-medium text-foreground">Time:</span> {meeting.meeting_time?.slice(0, 5)}</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStartConfirmed}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Start Meeting
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Meeting Dialog (existing) */}
      <CancelMeetingDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        meetingId={meeting.id}
        meetingReference={meeting.meeting_reference}
        onSuccess={onActionComplete}
      />
      {/* Reschedule Meeting Dialog (existing) */}
      <RescheduleMeetingDialog
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        meetingId={meeting.id}
        meetingReference={meeting.meeting_reference}
        currentDate={meeting.meeting_date}
        currentTime={meeting.meeting_time}
        workflowId={meeting.workflow_id}
        workflowInstanceId={meeting.workflow_instance_id}
        stepId={meeting.step_id}
        applicationReference={meeting.application_reference}
        onSuccess={onActionComplete}
      />
    </>
  );
}
