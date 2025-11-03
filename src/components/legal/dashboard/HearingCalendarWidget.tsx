import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { HearingCalendarDay } from '@/adapters/legalDashboardAdapter';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HearingCalendarWidgetProps {
  data: HearingCalendarDay[] | null;
  loading: boolean;
  year: number;
  month: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onDateClick?: (date: string) => void;
}

export function HearingCalendarWidget({
  data,
  loading,
  year,
  month,
  onYearChange,
  onMonthChange,
  onDateClick
}: HearingCalendarWidgetProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const navigate = useNavigate();

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    if (month === 0) {
      onMonthChange(11);
      onYearChange(year - 1);
    } else {
      onMonthChange(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      onMonthChange(0);
      onYearChange(year + 1);
    } else {
      onMonthChange(month + 1);
    }
  };

  const getDayData = (day: number) => data.find(d => d.day === day);

  const selectedDayData = selectedDay ? getDayData(selectedDay) : null;
  const upcomingHearings = selectedDayData?.hearings || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-foreground">
              Hearings — Month Snapshot
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevMonth} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-foreground min-w-32 text-center">
                {monthNames[month]} {year}
              </span>
              <Button variant="outline" size="sm" onClick={handleNextMonth} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}
            
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2" />
            ))}
            
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayData = getDayData(day);
              const hasHearings = dayData && dayData.count > 0;
              const isSelected = selectedDay === day;
              
              return (
                <button
                  key={day}
                  className={`p-2 text-sm rounded-md transition-colors relative ${
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : hasHearings
                      ? 'bg-blue-100 dark:bg-blue-950 hover:bg-blue-200 dark:hover:bg-blue-900 text-foreground'
                      : 'hover:bg-muted text-foreground'
                  }`}
                  onClick={() => setSelectedDay(day)}
                  aria-label={`Day ${day}${hasHearings ? ` with ${dayData.count} hearings` : ''}`}
                >
                  {day}
                  {hasHearings && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                      {Array.from({ length: Math.min(dayData.count, 3) }).map((_, i) => (
                        <div key={i} className="w-1 h-1 rounded-full bg-blue-600" />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Hearings List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            {selectedDay ? `Hearings on ${monthNames[month]} ${selectedDay}, ${year}` : 'Upcoming Hearings'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingHearings.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {selectedDay ? 'No hearings scheduled for this day' : 'Select a day to view hearings'}
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {upcomingHearings.map((hearing) => (
                <div
                  key={hearing.id}
                  className="border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/legal/cases/${hearing.caseNumber.toLowerCase()}`)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground text-sm">{hearing.caseNumber}</span>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded">
                          {hearing.type}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{hearing.description}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>🕒 {hearing.time}</span>
                        <span>👥 {hearing.panel}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
