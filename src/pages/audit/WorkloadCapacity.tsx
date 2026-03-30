import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useIAAuditors, useIAActivities, useIAActiveAuditors, useIAHolidays, useIALeaveRequests } from '@/hooks/useAuditData';
import { TrendingUp, Users, Clock, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import { PageShell, StatusBadge } from '@/components/common';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeamAvailabilityDashboard } from '@/components/audit/TeamAvailabilityDashboard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, eachWeekOfInterval, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend, isSameDay, addMonths } from 'date-fns';

const WORKING_HOURS_PER_DAY = 8;
const WORKING_DAYS_PER_MONTH = 20;

function getWorkingDaysInRange(start: Date, end: Date, holidays: any[]): number {
  const days = eachDayOfInterval({ start, end });
  return days.filter(d => {
    if (isWeekend(d)) return false;
    if (holidays.some((h: any) => h.date && isSameDay(parseISO(h.date), d))) return false;
    return true;
  }).length;
}

function getAuditorLeaveDaysInRange(auditorId: string, start: Date, end: Date, leaveRequests: any[]): number {
  const approvedLeaves = leaveRequests.filter((lr: any) => lr.auditor_id === auditorId && lr.status === 'Approved');
  const days = eachDayOfInterval({ start, end });
  return days.filter(d => {
    if (isWeekend(d)) return false;
    return approvedLeaves.some((lr: any) => {
      if (!lr.start_date || !lr.end_date) return false;
      return isWithinInterval(d, { start: parseISO(lr.start_date), end: parseISO(lr.end_date) });
    });
  }).length;
}

export default function WorkloadCapacity() {
  const { data: auditors = [], isLoading: loadingAuditors } = useIAAuditors();
  const { data: activities = [], isLoading: loadingActivities } = useIAActivities();
  const { data: holidays = [] } = useIAHolidays();
  const { data: leaveRequests = [] } = useIALeaveRequests();

  const [viewPeriod, setViewPeriod] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const isLoading = loadingAuditors || loadingActivities;

  const monthStart = startOfMonth(parseISO(selectedMonth + '-01'));
  const monthEnd = endOfMonth(monthStart);

  const auditorWorkloads = useMemo(() => {
    const totalWorkingDays = getWorkingDaysInRange(monthStart, monthEnd, holidays);

    return auditors.map((auditor: any) => {
      const leaveDays = getAuditorLeaveDaysInRange(auditor.id, monthStart, monthEnd, leaveRequests);
      const availableDays = totalWorkingDays - leaveDays;
      const availableHours = availableDays * WORKING_HOURS_PER_DAY;

      // Get activities assigned to this auditor
      const assignedActivities = activities.filter((act: any) => act.auditor_id === auditor.id);
      const completedActivities = assignedActivities.filter((act: any) => act.status === 'Completed');
      const inProgressActivities = assignedActivities.filter((act: any) => act.status === 'In Progress');

      // Calculate actual allocated hours based on allocation percentage and estimated days
      // Prevent double-counting: sum allocation per unique engagement
      const engagementAllocations = new Map<string, number>();
      assignedActivities.forEach((act: any) => {
        const engId = act.engagement_id || act.id;
        const allocationPct = (act.allocation_percentage || 100) / 100;
        const estimatedDays = act.estimated_days || 1;
        const allocatedHours = estimatedDays * WORKING_HOURS_PER_DAY * allocationPct;
        // Take the max allocation per engagement (not additive for same engagement)
        const existing = engagementAllocations.get(engId) || 0;
        engagementAllocations.set(engId, Math.max(existing, allocatedHours));
      });

      const assignedHours = Array.from(engagementAllocations.values()).reduce((sum, h) => sum + h, 0);
      const utilizationRate = availableHours > 0 ? (assignedHours / availableHours) * 100 : 0;

      let capacityStatus: string;
      if (utilizationRate > 100) capacityStatus = 'Overbooked';
      else if (utilizationRate >= 85) capacityStatus = 'Fully Utilized';
      else if (utilizationRate >= 50) capacityStatus = 'Moderate';
      else capacityStatus = 'Available';

      return {
        ...auditor,
        totalActivities: assignedActivities.length,
        completedActivities: completedActivities.length,
        inProgressActivities: inProgressActivities.length,
        totalWorkingDays,
        leaveDays,
        availableDays,
        availableHours,
        assignedHours: Math.round(assignedHours * 10) / 10,
        remainingHours: Math.round((availableHours - assignedHours) * 10) / 10,
        utilizationRate: Math.min(Math.round(utilizationRate), 150),
        capacityStatus,
      };
    });
  }, [auditors, activities, holidays, leaveRequests, monthStart, monthEnd]);

  // Weekly breakdown for selected month
  const weeklyBreakdown = useMemo(() => {
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
    return weeks.map((weekStart) => {
      const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const workingDays = getWorkingDaysInRange(weekStart, wEnd > monthEnd ? monthEnd : wEnd, holidays);
      const label = `${format(weekStart, 'dd MMM')} – ${format(wEnd > monthEnd ? monthEnd : wEnd, 'dd MMM')}`;
      return { weekStart, label, workingDays };
    });
  }, [monthStart, monthEnd, holidays]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Overbooked': return 'text-destructive';
      case 'Fully Utilized': return 'text-amber-600';
      case 'Moderate': return 'text-primary';
      case 'Available': return 'text-muted-foreground';
      default: return '';
    }
  };

  const getProgressColor = (rate: number) => {
    if (rate > 100) return '[&>div]:bg-destructive';
    if (rate >= 85) return '[&>div]:bg-amber-500';
    return '';
  };

  const monthOptions = useMemo(() => {
    const options = [];
    for (let i = -3; i <= 6; i++) {
      const d = addMonths(new Date(), i);
      options.push({ value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') });
    }
    return options;
  }, []);

  return (
    <PageShell
      title="Auditor Workload & Capacity"
      subtitle="Monitor auditor capacity, utilization, and scheduling conflicts"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/dashboard' }, { label: 'Workload & Capacity' }]}
      isLoading={isLoading}
    >
      {/* Period selector */}
      <div className="flex items-center gap-3">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="secondary">
          {auditorWorkloads.filter(a => a.capacityStatus === 'Available').length} available
        </Badge>
        <Badge variant="outline" className="border-amber-300 text-amber-700">
          {auditorWorkloads.filter(a => a.capacityStatus === 'Overbooked').length} overbooked
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Auditors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{auditors.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{activities.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Utilization</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditorWorkloads.length > 0 ? Math.round(auditorWorkloads.reduce((s, a) => s + a.utilizationRate, 0) / auditorWorkloads.length) : 0}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Holidays This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {holidays.filter((h: any) => h.date && isWithinInterval(parseISO(h.date), { start: monthStart, end: monthEnd })).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="workload" className="w-full">
        <TabsList>
          <TabsTrigger value="workload">Workload & Capacity</TabsTrigger>
          <TabsTrigger value="availability">Team Availability</TabsTrigger>
          <TabsTrigger value="skills">Skills Coverage</TabsTrigger>
        </TabsList>

        <TabsContent value="workload">
          <Card>
            <CardHeader><CardTitle>Auditor Capacity Overview — {format(monthStart, 'MMMM yyyy')}</CardTitle></CardHeader>
            <CardContent>
              {auditorWorkloads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No auditors found.</div>
              ) : (
                <div className="space-y-6">
                  {auditorWorkloads.map((auditor) => (
                    <div key={auditor.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {auditor.name}
                            {auditor.capacityStatus === 'Overbooked' && (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{auditor.role}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {auditor.assignedHours} / {auditor.availableHours} hrs
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {auditor.remainingHours > 0 ? `${auditor.remainingHours} hrs remaining` : 'No capacity'}
                              {auditor.leaveDays > 0 && (
                                <span className="ml-1 text-amber-600">• {auditor.leaveDays}d leave</span>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className={getStatusColor(auditor.capacityStatus)}>
                            {auditor.capacityStatus}
                          </Badge>
                        </div>
                      </div>
                      <Progress
                        value={Math.min(auditor.utilizationRate, 100)}
                        className={`h-2 ${getProgressColor(auditor.utilizationRate)}`}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{auditor.totalActivities} activities | {auditor.completedActivities} completed | {auditor.inProgressActivities} in progress</span>
                        <span className={getStatusColor(auditor.capacityStatus)}>
                          {Math.round(auditor.utilizationRate)}% utilized
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability">
          <TeamAvailabilityDashboard />
        </TabsContent>

        <TabsContent value="skills">
          <Card>
            <CardHeader><CardTitle>Skills Coverage</CardTitle></CardHeader>
            <CardContent>
              {auditors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No auditors found.</div>
              ) : (
                <div className="space-y-4">
                  {auditors.map((auditor: any) => (
                    <div key={auditor.id} className="flex items-start gap-4">
                      <div className="min-w-[200px]">
                        <div className="font-medium">{auditor.name}</div>
                        <div className="text-sm text-muted-foreground">{auditor.seniority_level}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(auditor.skills || []).map((skill: string, idx: number) => (
                          <Badge key={idx} variant="outline">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
