import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, Clock, MapPin, User, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { auditActivities, calendarEvents } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';
import { ActivityScheduleForm } from '@/components/audit/ActivityScheduleForm';
import { Link } from 'react-router-dom';

export default function ActivityCalendar() {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedAuditor, setSelectedAuditor] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<'calendar' | 'list'>('list');

  const filteredActivities = auditActivities.filter(activity => {
    const matchesAuditor = selectedAuditor === 'all' || activity.auditor === selectedAuditor;
    const matchesStatus = selectedStatus === 'all' || activity.status === selectedStatus;
    return matchesAuditor && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const colors = {
      'Planned': 'bg-blue-500',
      'In Progress': 'bg-yellow-500',
      'Completed': 'bg-green-500',
      'Cancelled': 'bg-red-500',
      'Rescheduled': 'bg-purple-500'
    };
    return <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500'}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      'Low': 'bg-green-500',
      'Medium': 'bg-yellow-500',
      'High': 'bg-red-500'
    };
    return <Badge variant="outline" className={colors[priority as keyof typeof colors]}>{priority}</Badge>;
  };

  const handleReschedule = (activityId: string) => {
    toast({
      title: "Activity Rescheduled",
      description: "Audit activity has been rescheduled successfully."
    });
  };

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'Site Visit': return <MapPin className="w-4 h-4" />;
      case 'Records Review': return <CalendarDays className="w-4 h-4" />;
      case 'Contribution Verification': return <Clock className="w-4 h-4" />;
      default: return <CalendarDays className="w-4 h-4" />;
    }
  };

  const todaysActivities = filteredActivities.filter(activity => {
    const activityDate = new Date(activity.startDate).toDateString();
    const today = new Date().toDateString();
    return activityDate === today;
  });

  const upcomingActivities = filteredActivities.filter(activity => {
    const activityDate = new Date(activity.startDate);
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    return activityDate > today && activityDate <= nextWeek;
  });

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
          <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Schedule Activity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule New Activity</DialogTitle>
              </DialogHeader>
              <ActivityScheduleForm onClose={() => setIsScheduleDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Today's Activities</p>
                <p className="text-2xl font-bold">{todaysActivities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">This Week</p>
                <p className="text-2xl font-bold">{upcomingActivities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <User className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">In Progress</p>
                <p className="text-2xl font-bold">{filteredActivities.filter(a => a.status === 'In Progress').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">{filteredActivities.filter(a => a.status === 'Completed').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex gap-2">
              <Button 
                variant={calendarView === 'calendar' ? 'default' : 'outline'}
                onClick={() => setCalendarView('calendar')}
              >
                Calendar View
              </Button>
              <Button 
                variant={calendarView === 'list' ? 'default' : 'outline'}
                onClick={() => setCalendarView('list')}
              >
                List View
              </Button>
            </div>
            <div className="flex gap-4 flex-1">
              <Select value={selectedAuditor} onValueChange={setSelectedAuditor}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select auditor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Auditors</SelectItem>
                  <SelectItem value="auditor.jdoe@secureserve.gov">John Doe</SelectItem>
                  <SelectItem value="auditor.asmith@secureserve.gov">Alice Smith</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Planned">Planned</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="Rescheduled">Rescheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {calendarView === 'calendar' ? (
        /* Calendar View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                Activities for {selectedDate?.toLocaleDateString() || 'Selected Date'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDate && (
                <div className="space-y-4">
                  {filteredActivities
                    .filter(activity => 
                      new Date(activity.startDate).toDateString() === selectedDate.toDateString()
                    )
                    .map(activity => (
                      <Card key={activity.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                {getActivityTypeIcon(activity.type)}
                                <h4 className="font-medium">{activity.title}</h4>
                                {getStatusBadge(activity.status)}
                                {getPriorityBadge(activity.priority)}
                              </div>
                              <p className="text-sm text-muted-foreground">{activity.description}</p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(activity.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                                  {new Date(activity.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {activity.location}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {activity.auditorName}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {activity.status !== 'Completed' && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleReschedule(activity.id)}
                                >
                                  Reschedule
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  {filteredActivities.filter(activity => 
                    new Date(activity.startDate).toDateString() === selectedDate.toDateString()
                  ).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No activities scheduled for this date</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* List View */
        <Card>
          <CardHeader>
            <CardTitle>All Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Auditor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{activity.title}</div>
                        <div className="text-sm text-muted-foreground">{activity.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActivityTypeIcon(activity.type)}
                        {activity.type}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div>{new Date(activity.startDate).toLocaleDateString()}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(activity.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                          {new Date(activity.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{activity.auditorName}</TableCell>
                    <TableCell>{getStatusBadge(activity.status)}</TableCell>
                    <TableCell>{getPriorityBadge(activity.priority)}</TableCell>
                    <TableCell>{activity.location}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {activity.status !== 'Completed' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleReschedule(activity.id)}
                          >
                            Reschedule
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}