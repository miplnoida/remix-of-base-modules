import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, Clock, MapPin, User, Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIAActivities, useIADepartments, useIAAuditors } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';
import { ActivityScheduleForm } from '@/components/audit/ActivityScheduleForm';
import { ActivityRescheduleDialog } from '@/components/audit/ActivityRescheduleDialog';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ActivityCalendar() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedAuditor, setSelectedAuditor] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<'calendar' | 'list'>('list');

  const { data: activities = [], isLoading } = useIAActivities();
  const { data: departments = [] } = useIADepartments();
  const { data: auditors = [] } = useIAAuditors();

  const filteredActivities = activities.filter((a: any) => {
    const matchesAuditor = selectedAuditor === 'all' || a.auditor_id === selectedAuditor;
    const matchesStatus = selectedStatus === 'all' || a.status === selectedStatus;
    return matchesAuditor && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = { 'Planned': 'bg-blue-500', 'In Progress': 'bg-orange-600', 'Completed': 'bg-green-500', 'Cancelled': 'bg-red-500', 'Rescheduled': 'bg-purple-500' };
    return <Badge className={colors[status] || 'bg-gray-500'}>{status}</Badge>;
  };

  const todaysActivities = filteredActivities.filter((a: any) => a.scheduled_date && new Date(a.scheduled_date).toDateString() === new Date().toDateString());
  const upcomingActivities = filteredActivities.filter((a: any) => {
    if (!a.scheduled_date) return false;
    const d = new Date(a.scheduled_date);
    const today = new Date();
    const nextWeek = new Date(); nextWeek.setDate(today.getDate() + 7);
    return d > today && d <= nextWeek;
  });

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity Calendar</h1>
          <p className="text-muted-foreground">
            Schedule and manage audit activities |
            <Link to="/audit/plans" className="text-blue-600 hover:underline ml-1">View Plans</Link> |
            <Link to="/audit/workbench" className="text-blue-600 hover:underline ml-1">Activity Workbench</Link>
          </p>
        </div>
        {hasPermission('execute_audit_activities') && (
          <Button onClick={() => setIsScheduleDialogOpen(!isScheduleDialogOpen)}>
            <Plus className="w-4 h-4 mr-2" />Schedule Activity
          </Button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center"><CalendarDays className="h-4 w-4 text-muted-foreground" /><div className="ml-2"><p className="text-sm font-medium">Today's Activities</p><p className="text-2xl font-bold">{todaysActivities.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center"><Clock className="h-4 w-4 text-muted-foreground" /><div className="ml-2"><p className="text-sm font-medium">This Week</p><p className="text-2xl font-bold">{upcomingActivities.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center"><User className="h-4 w-4 text-muted-foreground" /><div className="ml-2"><p className="text-sm font-medium">In Progress</p><p className="text-2xl font-bold">{filteredActivities.filter((a: any) => a.status === 'In Progress').length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center"><MapPin className="h-4 w-4 text-muted-foreground" /><div className="ml-2"><p className="text-sm font-medium">Completed</p><p className="text-2xl font-bold">{filteredActivities.filter((a: any) => a.status === 'Completed').length}</p></div></div></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex gap-2">
              <Button variant={calendarView === 'calendar' ? 'default' : 'outline'} onClick={() => setCalendarView('calendar')}>Calendar View</Button>
              <Button variant={calendarView === 'list' ? 'default' : 'outline'} onClick={() => setCalendarView('list')}>List View</Button>
            </div>
            <div className="flex gap-4 flex-1">
              <Select value={selectedAuditor} onValueChange={setSelectedAuditor}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select auditor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Auditors</SelectItem>
                  {auditors.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Planned">Planned</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List View */}
      <Card>
        <CardHeader><CardTitle>All Activities</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Auditor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.map((activity: any) => {
                const auditor = auditors.find((a: any) => a.id === activity.auditor_id);
                return (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <div><div className="font-medium">{activity.title}</div><div className="text-sm text-muted-foreground">{activity.description}</div></div>
                    </TableCell>
                    <TableCell>{activity.activity_type || '-'}</TableCell>
                    <TableCell>{activity.scheduled_date ? new Date(activity.scheduled_date).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>{auditor?.name || '-'}</TableCell>
                    <TableCell>{getStatusBadge(activity.status)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Schedule Form */}
      {!isMobile && isScheduleDialogOpen && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Schedule New Activity</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsScheduleDialogOpen(false)}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent><ActivityScheduleForm onClose={() => setIsScheduleDialogOpen(false)} /></CardContent>
        </Card>
      )}
    </div>
  );
}
