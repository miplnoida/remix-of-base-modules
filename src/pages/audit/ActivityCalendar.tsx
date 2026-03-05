import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, MapPin, User, Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIAActivities, useIADepartments, useIAAuditors } from '@/hooks/useAuditData';
import { ActivityScheduleForm } from '@/components/audit/ActivityScheduleForm';
import { useIsMobile } from '@/hooks/use-mobile';
import { PageShell, SearchBar, FilterBar, StatusBadge, EntityModal } from '@/components/common';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/audit-calendar.css';

const localizer = momentLocalizer(moment);

export default function ActivityCalendar() {
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const [filters, setFilters] = useState<Record<string, string>>({ auditor: 'all', status: 'all' });
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentView, setCurrentView] = useState<typeof Views[keyof typeof Views]>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: activities = [], isLoading } = useIAActivities();
  const { data: departments = [] } = useIADepartments();
  const { data: auditors = [] } = useIAAuditors();

  const filteredActivities = activities.filter((a: any) => {
    const matchesAuditor = filters.auditor === 'all' || a.auditor_id === filters.auditor;
    const matchesStatus = filters.status === 'all' || a.status === filters.status;
    return matchesAuditor && matchesStatus;
  });

  const calendarEvents = useMemo(() => 
    filteredActivities
      .filter((a: any) => a.scheduled_date)
      .map((a: any) => ({
        id: a.id,
        title: a.title || 'Untitled Activity',
        start: new Date(a.scheduled_date),
        end: a.end_date ? new Date(a.end_date) : new Date(a.scheduled_date),
        resource: a,
      })),
    [filteredActivities]
  );

  const todaysActivities = filteredActivities.filter((a: any) => a.scheduled_date && new Date(a.scheduled_date).toDateString() === new Date().toDateString());
  const upcomingActivities = filteredActivities.filter((a: any) => {
    if (!a.scheduled_date) return false;
    const d = new Date(a.scheduled_date);
    const today = new Date();
    const nextWeek = new Date(); nextWeek.setDate(today.getDate() + 7);
    return d > today && d <= nextWeek;
  });

  const eventStyleGetter = useCallback((event: any) => {
    const status = event.resource?.status;
    let backgroundColor = 'hsl(var(--primary))';
    if (status === 'Completed') backgroundColor = 'hsl(142, 76%, 36%)';
    else if (status === 'In Progress') backgroundColor = 'hsl(217, 91%, 60%)';
    else if (status === 'Cancelled') backgroundColor = 'hsl(var(--muted-foreground))';
    return { style: { backgroundColor, borderRadius: '4px', border: 'none', fontSize: '0.75rem', padding: '2px 4px' } };
  }, []);

  const handleSelectEvent = useCallback((event: any) => {
    setSelectedEvent(event.resource);
  }, []);

  const filterFields = [
    { key: 'auditor', label: 'Auditor', type: 'select' as const, options: [{ value: 'all', label: 'All Auditors' }, ...auditors.map((a: any) => ({ value: a.id, label: a.name }))] },
    { key: 'status', label: 'Status', type: 'select' as const, options: [{ value: 'all', label: 'All Statuses' }, { value: 'Planned', label: 'Planned' }, { value: 'In Progress', label: 'In Progress' }, { value: 'Completed', label: 'Completed' }, { value: 'Cancelled', label: 'Cancelled' }] },
  ];

  return (
    <PageShell
      title="Activity Calendar"
      subtitle="Schedule and manage audit activities"
      breadcrumbs={[{ label: 'Internal Audit', href: '/' }, { label: 'Activity Calendar' }]}
      isLoading={isLoading}
      actions={hasPermission('execute_audit_activities') ? <Button onClick={() => setIsScheduleDialogOpen(!isScheduleDialogOpen)}><Plus className="w-4 h-4 mr-2" />Schedule Activity</Button> : undefined}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center"><CalendarDays className="h-5 w-5 text-muted-foreground" /><div className="ml-3"><p className="text-sm text-muted-foreground">Today's Activities</p><p className="text-2xl font-bold">{todaysActivities.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center"><Clock className="h-5 w-5 text-muted-foreground" /><div className="ml-3"><p className="text-sm text-muted-foreground">This Week</p><p className="text-2xl font-bold">{upcomingActivities.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center"><User className="h-5 w-5 text-muted-foreground" /><div className="ml-3"><p className="text-sm text-muted-foreground">In Progress</p><p className="text-2xl font-bold">{filteredActivities.filter((a: any) => a.status === 'In Progress').length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center"><MapPin className="h-5 w-5 text-muted-foreground" /><div className="ml-3"><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-bold">{filteredActivities.filter((a: any) => a.status === 'Completed').length}</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <FilterBar
            filters={filterFields}
            values={filters}
            onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
            onReset={() => setFilters({ auditor: 'all', status: 'all' })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div style={{ height: isMobile ? 400 : 600 }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              view={currentView as any}
              onView={(view) => setCurrentView(view)}
              date={currentDate}
              onNavigate={(date) => setCurrentDate(date)}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
              style={{ height: '100%' }}
              popup
            />
          </div>
        </CardContent>
      </Card>

      {/* View Event Modal */}
      <EntityModal open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)} title="Activity Details" mode="view">
        {selectedEvent && (
          <div className="space-y-4">
            <div><span className="text-sm text-muted-foreground">Title</span><p className="font-medium">{selectedEvent.title}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-sm text-muted-foreground">Type</span><p>{selectedEvent.activity_type || '-'}</p></div>
              <div><span className="text-sm text-muted-foreground">Status</span><div className="mt-1"><StatusBadge status={selectedEvent.status} /></div></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-sm text-muted-foreground">Scheduled Date</span><p>{selectedEvent.scheduled_date ? new Date(selectedEvent.scheduled_date).toLocaleDateString() : '-'}</p></div>
              <div><span className="text-sm text-muted-foreground">Auditor</span><p>{auditors.find((a: any) => a.id === selectedEvent.auditor_id)?.name || '-'}</p></div>
            </div>
            <div><span className="text-sm text-muted-foreground">Description</span><p>{selectedEvent.description || '-'}</p></div>
          </div>
        )}
      </EntityModal>

      {!isMobile && isScheduleDialogOpen && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Schedule New Activity</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsScheduleDialogOpen(false)}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent><ActivityScheduleForm onClose={() => setIsScheduleDialogOpen(false)} /></CardContent>
        </Card>
      )}
    </PageShell>
  );
}
