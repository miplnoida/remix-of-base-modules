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
import { ChevronLeft, ChevronRight, Clock, MapPin, FileText, CalendarDays } from 'lucide-react';
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
} from 'date-fns';

interface MeetingCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_COLORS: Record<string, string> = {
  Scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  Rescheduled: 'bg-amber-100 text-amber-800 border-amber-200',
  InProgress: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Closed: 'bg-gray-100 text-gray-600 border-gray-200',
  Cancelled: 'bg-red-100 text-red-700 border-red-200',
  Rejected: 'bg-rose-100 text-rose-700 border-rose-200',
};

export function MeetingCalendarModal({ open, onOpenChange }: MeetingCalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { meetingsByDate, isLoading, error } = useMeetingCalendar(currentMonth);

  const prevMonth = () => setCurrentMonth(m => subMonths(m, 1));
  const nextMonth = () => setCurrentMonth(m => addMonths(m, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

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

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const selectedMeetings = selectedDateStr ? (meetingsByDate[selectedDateStr] || []) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-primary" />
            My Meeting Calendar
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          {/* Calendar Grid */}
          <div className="flex-1 p-4 min-w-0">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={goToToday}>
                  Today
                </Button>
              </div>
              <Button variant="ghost" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day Cells */}
            <div className="grid grid-cols-7 gap-px bg-muted/30 rounded-lg overflow-hidden">
              {calendarDays.map((day, idx) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayMeetings = meetingsByDate[dateStr] || [];
                const hasMeetings = dayMeetings.length > 0;
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      'relative flex flex-col items-center justify-start p-1.5 min-h-[52px] text-sm transition-colors bg-background hover:bg-accent/50',
                      !isCurrentMonth && 'text-muted-foreground/40',
                      isSelected && 'ring-2 ring-primary bg-primary/5',
                      isTodayDate && !isSelected && 'bg-primary/10'
                    )}
                  >
                    <span
                      className={cn(
                        'text-xs font-medium leading-none mb-1',
                        isTodayDate && 'text-primary font-bold',
                        isSelected && 'text-primary font-bold'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {hasMeetings && (
                      <div className="flex gap-0.5 flex-wrap justify-center">
                        {dayMeetings.slice(0, 3).map((m, i) => (
                          <span
                            key={i}
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              m.status === 'Scheduled' ? 'bg-blue-500' :
                              m.status === 'InProgress' ? 'bg-emerald-500' :
                              m.status === 'Rescheduled' ? 'bg-amber-500' :
                              'bg-gray-400'
                            )}
                          />
                        ))}
                        {dayMeetings.length > 3 && (
                          <span className="text-[9px] text-muted-foreground">+{dayMeetings.length - 3}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {isLoading && (
              <div className="text-center text-sm text-muted-foreground mt-3">Loading meetings...</div>
            )}
            {error && (
              <div className="text-center text-sm text-destructive mt-3">Failed to load meetings.</div>
            )}
          </div>

          {/* Meeting Detail Panel */}
          <div className="w-full md:w-72 border-t md:border-t-0 md:border-l bg-muted/20 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b bg-background">
              <h4 className="text-sm font-semibold">
                {selectedDate
                  ? formatDisplayDate(format(selectedDate, 'yyyy-MM-dd'))
                  : 'Select a date'}
              </h4>
              {selectedDate && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedMeetings.length} meeting{selectedMeetings.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <ScrollArea className="flex-1 max-h-[340px]">
              <div className="p-3 space-y-2">
                {!selectedDate && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Click on a date to see meetings
                  </p>
                )}
                {selectedDate && selectedMeetings.length === 0 && (
                  <div className="text-center py-8">
                    <CalendarDays className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No meetings scheduled</p>
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

function MeetingCard({ meeting }: { meeting: CalendarMeeting }) {
  const statusClass = STATUS_COLORS[meeting.status] || STATUS_COLORS.Scheduled;

  // Extract applicant name from metadata if available
  const applicantName = meeting.metadata?.applicantName || meeting.metadata?.applicant_name || null;

  return (
    <div className="rounded-lg border bg-background p-3 space-y-2 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {meeting.meeting_reference}
          </p>
          {applicantName && (
            <p className="text-xs text-muted-foreground truncate">{applicantName}</p>
          )}
        </div>
        <Badge variant="outline" className={cn('text-[10px] shrink-0 border', statusClass)}>
          {meeting.status}
        </Badge>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            {meeting.meeting_time?.slice(0, 5)}
            {meeting.meeting_end_time && ` – ${meeting.meeting_end_time.slice(0, 5)}`}
          </span>
        </div>

        {meeting.office_address && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{meeting.office_address}</span>
          </div>
        )}

        {meeting.remarks && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <FileText className="h-3 w-3 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{meeting.remarks}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1 border-t">
        <span>{meeting.meeting_type}</span>
        <span>•</span>
        <span>{meeting.application_reference}</span>
      </div>
    </div>
  );
}
