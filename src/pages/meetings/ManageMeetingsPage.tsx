import { useState, useMemo } from 'react';
import { useProfileNameByUserCode } from '@/hooks/useProfileByUserCode';
import { format, startOfDay, endOfDay } from 'date-fns';
import { formatDisplayDate, parseDateSafe } from '@/lib/dateFormat';
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
  PlayCircle,
  Layers
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

function ContactPersonName({ userCode }: { userCode: string }) {
  const { data: name } = useProfileNameByUserCode(userCode);
  return <>{name || userCode}</>;
}

function MeetingRow({ meeting, onView, onResume, showAppRef = false }: {
  meeting: Meeting;
  onView: (id: string) => void;
  onResume: (id: string) => void;
  showAppRef?: boolean;
}) {
  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      const d = new Date();
      d.setHours(parseInt(hours), parseInt(minutes));
      return format(d, 'h:mm a');
    } catch {
      return time;
    }
  };

  return (
    <div
      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => onView(meeting.id)}
    >
      <div className="flex items-start gap-4">
        <div className="text-center min-w-[60px]">
          <p className="text-2xl font-bold">
            {format(parseDateSafe(meeting.meeting_date), 'd')}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(parseDateSafe(meeting.meeting_date), 'MMM')}
          </p>
        </div>
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
          {showAppRef && (
            <p className="text-sm text-muted-foreground">
              Application: {meeting.application_reference}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(meeting.meeting_time)}
            </span>
            {meeting.contact_person && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <ContactPersonName userCode={meeting.contact_person} />
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
              onResume(meeting.id);
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
  );
}

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

  const isAllDates = !filters.dateFrom && !filters.dateTo;

  const { data: meetings, isLoading, refetch } = useMeetings({
    ...filters,
    applicationReference: searchTerm || undefined,
    meetingReference: searchTerm || undefined
  });

  // Sort meetings by date and time
  const sortedMeetings = useMemo(() => {
    if (!meetings) return [];
    return [...meetings].sort((a, b) => {
      const dateCmp = a.meeting_date.localeCompare(b.meeting_date);
      if (dateCmp !== 0) return dateCmp;
      return (a.meeting_time || '').localeCompare(b.meeting_time || '');
    });
  }, [meetings]);

  // Group meetings by application reference when in "All Dates" mode
  const groupedMeetings = useMemo(() => {
    if (!sortedMeetings.length || !isAllDates) return null;
    const groups: Record<string, Meeting[]> = {};
    for (const m of sortedMeetings) {
      const key = m.application_reference;
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }
    // Sort groups by most recent meeting date desc
    return Object.entries(groups).sort((a, b) => {
      const latestA = a[1].reduce((max, m) => m.meeting_date > max ? m.meeting_date : max, '');
      const latestB = b[1].reduce((max, m) => m.meeting_date > max ? m.meeting_date : max, '');
      return latestB.localeCompare(latestA);
    });
  }, [sortedMeetings, isAllDates]);

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
            {sortedMeetings.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {sortedMeetings.length}
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
          ) : !sortedMeetings.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No meetings found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : isAllDates && groupedMeetings ? (
            /* Grouped by application reference */
            <div className="space-y-6">
              {groupedMeetings.map(([appRef, groupMeetings]) => (
                <div key={appRef} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2.5 flex items-center gap-2 border-b">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">{appRef}</span>
                    <Badge variant="secondary" className="text-xs">
                      {groupMeetings.length} meeting{groupMeetings.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="divide-y">
                    {groupMeetings.map((meeting) => (
                      <MeetingRow
                        key={meeting.id}
                        meeting={meeting}
                        onView={openMeetingDetail}
                        onResume={(id) => navigate(`/meetings/start/${id}`)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Flat list */
            <div className="space-y-3">
              {sortedMeetings.map((meeting) => (
                <MeetingRow
                  key={meeting.id}
                  meeting={meeting}
                  onView={openMeetingDetail}
                  onResume={(id) => navigate(`/meetings/start/${id}`)}
                  showAppRef
                />
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
