import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar, AlertTriangle, CheckCircle2, Clock, Users, Search, RefreshCw, Loader2, Shield } from 'lucide-react';
import { useIAActiveAuditors, useIALeaveRequests, useIAHolidays } from '@/hooks/useAuditData';
import { useTeamAvailabilityCheck } from '@/hooks/useAuditWorkflowGates';
import { ConflictAlertPanel } from './ConflictAlertPanel';
import { formatDateForDisplay } from '@/lib/format-config';
import { format, addDays, startOfWeek, endOfWeek, isWithinInterval, parseISO, isSameDay } from 'date-fns';

interface TeamAvailabilityDashboardProps {
  planId?: string;
}

type DayStatus = 'available' | 'leave' | 'holiday' | 'conflict' | 'weekend';

interface AuditorDayCell {
  status: DayStatus;
  label?: string;
}

export function TeamAvailabilityDashboard({ planId }: TeamAvailabilityDashboardProps) {
  const { data: auditors = [] } = useIAActiveAuditors();
  const { data: leaveRequests = [] } = useIALeaveRequests();
  const { data: holidays = [] } = useIAHolidays();
  const checkAvailability = useTeamAvailabilityCheck();

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedAuditorIds, setSelectedAuditorIds] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Compute current week
  const today = new Date();
  const weekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const approvedLeaves = useMemo(() =>
    leaveRequests.filter((lr: any) => lr.status === 'Approved'),
    [leaveRequests]
  );

  const getAuditorDayStatus = (auditorId: string, day: Date): AuditorDayCell => {
    const dayOfWeek = day.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { status: 'weekend', label: 'Weekend' };
    }

    const dayStr = format(day, 'yyyy-MM-dd');

    // Check holidays
    const holiday = holidays.find((h: any) => {
      if (!h.holiday_date) return false;
      return isSameDay(parseISO(h.holiday_date), day);
    });
    if (holiday) return { status: 'holiday', label: (holiday as any).name || 'Holiday' };

    // Check leave
    const leave = approvedLeaves.find((lr: any) => {
      if (lr.auditor_id !== auditorId || !lr.start_date || !lr.end_date) return false;
      return isWithinInterval(day, { start: parseISO(lr.start_date), end: parseISO(lr.end_date) });
    });
    if (leave) return { status: 'leave', label: (leave as any).leave_type || 'Leave' };

    return { status: 'available' };
  };

  const statusColors: Record<DayStatus, string> = {
    available: 'bg-green-100 text-green-800 border-green-200',
    leave: 'bg-amber-100 text-amber-800 border-amber-200',
    holiday: 'bg-blue-100 text-blue-800 border-blue-200',
    conflict: 'bg-destructive/10 text-destructive border-destructive/20',
    weekend: 'bg-muted text-muted-foreground border-muted',
  };

  const statusIcons: Record<DayStatus, React.ReactNode> = {
    available: <CheckCircle2 className="h-3 w-3" />,
    leave: <Clock className="h-3 w-3" />,
    holiday: <Calendar className="h-3 w-3" />,
    conflict: <AlertTriangle className="h-3 w-3" />,
    weekend: null,
  };

  const handleBulkCheck = async () => {
    const ids = selectedAuditorIds.length > 0 ? selectedAuditorIds : undefined;
    await checkAvailability.mutateAsync({
      planId: planId || undefined,
      auditorIds: ids,
      dateFrom: dateFrom || format(weekStart, 'yyyy-MM-dd'),
      dateTo: dateTo || format(weekEnd, 'yyyy-MM-dd'),
    });
  };

  // Summary stats
  const availabilitySummary = useMemo(() => {
    let totalSlots = 0;
    let available = 0;
    let onLeave = 0;
    let onHoliday = 0;

    auditors.forEach((auditor: any) => {
      weekDays.forEach((day) => {
        const cell = getAuditorDayStatus(auditor.id, day);
        if (cell.status !== 'weekend') {
          totalSlots++;
          if (cell.status === 'available') available++;
          if (cell.status === 'leave') onLeave++;
          if (cell.status === 'holiday') onHoliday++;
        }
      });
    });

    return { totalSlots, available, onLeave, onHoliday, utilization: totalSlots > 0 ? Math.round((available / totalSlots) * 100) : 0 };
  }, [auditors, weekDays, approvedLeaves, holidays]);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Team Size</p>
                <p className="text-lg font-semibold">{auditors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Available Slots</p>
                <p className="text-lg font-semibold">{availabilitySummary.available}/{availabilitySummary.totalSlots}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <div>
                <p className="text-xs text-muted-foreground">On Leave</p>
                <p className="text-lg font-semibold">{availabilitySummary.onLeave}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Availability Rate</p>
                <p className="text-lg font-semibold">{availabilitySummary.utilization}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Team Availability Matrix
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}>← Prev</Button>
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>Today</Button>
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}>Next →</Button>
            </div>
            <div className="flex items-center gap-2">
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
            </div>
            <Button size="sm" variant="default" onClick={handleBulkCheck} disabled={checkAvailability.isPending}>
              {checkAvailability.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
              Check Conflicts
            </Button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs">
            {(['available', 'leave', 'holiday', 'weekend'] as DayStatus[]).map(status => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`h-3 w-3 rounded border ${statusColors[status]}`} />
                <span className="capitalize text-muted-foreground">{status}</span>
              </div>
            ))}
          </div>

          {/* Matrix Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium text-muted-foreground w-[180px] sticky left-0 bg-background z-10">Auditor</th>
                  {weekDays.map((day, i) => (
                    <th key={i} className="text-center px-1 py-1.5 font-medium text-muted-foreground min-w-[80px]">
                      <div>{format(day, 'EEE')}</div>
                      <div className="text-[10px]">{format(day, 'dd MMM')}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditors.map((auditor: any) => (
                  <tr key={auditor.id} className="border-t">
                    <td className="px-2 py-1.5 font-medium sticky left-0 bg-background z-10">
                      <div className="truncate max-w-[170px]">{auditor.name}</div>
                      <div className="text-[10px] text-muted-foreground">{auditor.role}</div>
                    </td>
                    {weekDays.map((day, i) => {
                      const cell = getAuditorDayStatus(auditor.id, day);
                      return (
                        <td key={i} className="px-1 py-1.5 text-center">
                          <div
                            className={`inline-flex items-center justify-center gap-1 rounded px-1.5 py-1 border text-[10px] w-full ${statusColors[cell.status]}`}
                            title={cell.label || cell.status}
                          >
                            {statusIcons[cell.status]}
                            <span className="truncate">{cell.label || (cell.status === 'available' ? '✓' : '')}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {auditors.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-muted-foreground">No auditors found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Show conflict results */}
      {checkAvailability.data && checkAvailability.data.total_conflicts > 0 && (
        <ConflictAlertPanel conflicts={checkAvailability.data.conflicts} />
      )}

      {checkAvailability.data && checkAvailability.data.total_conflicts === 0 && (
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">No Conflicts Detected</p>
              <p className="text-xs text-green-600">All team members are available for the selected period.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
