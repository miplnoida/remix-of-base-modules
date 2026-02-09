import { useState } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/date-picker';
import { useMeetings, useTodaysMeetings } from '@/hooks/useMeetings';
import { MeetingDetailView } from '@/components/meetings/MeetingDetailView';
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
  PlayCircle
} from 'lucide-react';

const statusColors: Record<MeetingStatus, string> = {
  'Scheduled': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'Rescheduled': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  'InProgress': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'Closed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Cancelled': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  'Rejected': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
};

const meetingTypeLabels: Record<MeetingType, string> = {
  'IP-Registration': 'Insured Person',
  'Employer-Registration': 'Employer',
  'Doctor-Registration': 'Doctor',
  'General': 'General'
};

export default function ManageMeetingsPage() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<MeetingFilters>({
    dateFrom: format(new Date(), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd')
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { data: meetings, isLoading, refetch } = useMeetings({
    ...filters,
    applicationReference: searchTerm || undefined,
    meetingReference: searchTerm || undefined
  });

  const handleFilterChange = (key: keyof MeetingFilters, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setFilters(prev => ({
      ...prev,
      dateFrom: date ? format(date, 'yyyy-MM-dd') : undefined
    }));
  };

  const handleDateToChange = (date: Date | undefined) => {
    setFilters(prev => ({
      ...prev,
      dateTo: date ? format(date, 'yyyy-MM-dd') : undefined
    }));
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: format(new Date(), 'yyyy-MM-dd'),
      dateTo: format(new Date(), 'yyyy-MM-dd')
    });
    setSearchTerm('');
  };

  const showAllDates = () => {
    setFilters(prev => ({
      ...prev,
      dateFrom: undefined,
      dateTo: undefined
    }));
  };

  const showToday = () => {
    setFilters(prev => ({
      ...prev,
      dateFrom: format(new Date(), 'yyyy-MM-dd'),
      dateTo: format(new Date(), 'yyyy-MM-dd')
    }));
  };

  const openMeetingDetail = (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    setDetailDialogOpen(true);
  };

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'h:mm a');
    } catch {
      return time;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Meetings</h1>
          <p className="text-muted-foreground">
            View and manage scheduled meetings across all workflows
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Quick Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button
          variant={filters.dateFrom === format(new Date(), 'yyyy-MM-dd') ? 'default' : 'outline'}
          size="sm"
          onClick={showToday}
        >
          <CalendarDays className="h-4 w-4 mr-2" />
          Today's Meetings
        </Button>
        <Button
          variant={!filters.dateFrom && !filters.dateTo ? 'default' : 'outline'}
          size="sm"
          onClick={showAllDates}
        >
          All Dates
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>

      {/* Search and Filters */}
      {showFilters && (
        <Card>
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Filters</CardTitle>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status */}
            <Select
              value={filters.status || 'all'}
              onValueChange={(v) => handleFilterChange('status', v)}
            >
              <SelectTrigger>
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

            {/* Meeting Type */}
            <Select
              value={filters.meetingType || 'all'}
              onValueChange={(v) => handleFilterChange('meetingType', v)}
            >
              <SelectTrigger>
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

            {/* Date Range */}
            <div className="flex gap-2">
              <DatePicker
                date={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                onDateChange={handleDateFromChange}
                placeholder="From"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meetings List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Meetings
            {meetings && (
              <Badge variant="secondary" className="ml-2">
                {meetings.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {filters.dateFrom === filters.dateTo && filters.dateFrom === format(new Date(), 'yyyy-MM-dd')
              ? "Today's scheduled meetings"
              : filters.dateFrom && filters.dateTo
                ? `Meetings from ${format(new Date(filters.dateFrom), 'MMM d')} to ${format(new Date(filters.dateTo), 'MMM d, yyyy')}`
                : 'All meetings'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : !meetings || meetings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No meetings found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => openMeetingDetail(meeting.id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Date/Time */}
                    <div className="text-center min-w-[60px]">
                      <p className="text-2xl font-bold">
                        {format(new Date(meeting.meeting_date), 'd')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(meeting.meeting_date), 'MMM')}
                      </p>
                    </div>

                    {/* Details */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{meeting.meeting_reference}</span>
                        <Badge className={statusColors[meeting.status]} variant="secondary">
                          {meeting.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {meetingTypeLabels[meeting.meeting_type]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Application: {meeting.application_reference}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(meeting.meeting_time)}
                        </span>
                        {meeting.contact_person && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {meeting.contact_person}
                          </span>
                        )}
                        {meeting.workflow_definitions?.name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {meeting.workflow_definitions.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {meeting.status === 'InProgress' && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/meetings/start/${meeting.id}`);
                        }}
                      >
                        <PlayCircle className="h-4 w-4 mr-1" />
                        Resume
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
