import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useMeetingDetails } from '@/hooks/useMeetings';
import { MeetingOutcomeButtons } from './MeetingOutcomeButtons';
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  FileText, 
  History, 
  Globe, 
  CheckCircle, 
  XCircle,
  AlertCircle
} from 'lucide-react';
import type { MeetingStatus } from '@/types/meetings';

interface MeetingDetailViewProps {
  meetingId: string;
  onClose?: () => void;
}

const statusColors: Record<MeetingStatus, string> = {
  'Scheduled': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'Rescheduled': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  'InProgress': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'Closed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Cancelled': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  'Rejected': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
};

export function MeetingDetailView({ meetingId, onClose }: MeetingDetailViewProps) {
  const { data, isLoading, error, refetch } = useMeetingDetails(meetingId);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <AlertCircle className="mr-2 h-5 w-5" />
        Failed to load meeting details
      </div>
    );
  }

  const { meeting, history, outcomes, apiLogs } = data;

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{meeting.meeting_reference}</h2>
          <p className="text-muted-foreground">
            Application: {meeting.application_reference}
          </p>
        </div>
        <Badge className={statusColors[meeting.status]}>
          {meeting.status}
        </Badge>
      </div>

      {/* Action Buttons */}
      {outcomes.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <MeetingOutcomeButtons
              meetingId={meeting.id}
              outcomes={outcomes}
              currentStatus={meeting.status}
              onOutcomeProcessed={() => refetch()}
            />
          </CardContent>
        </Card>
      )}

      {/* Meeting Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Meeting Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Date</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(meeting.meeting_date), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Time</p>
              <p className="text-sm text-muted-foreground">
                {formatTime(meeting.meeting_time)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Contact Person</p>
              <p className="text-sm text-muted-foreground">
                {meeting.contact_person || 'N/A'}
              </p>
              {meeting.contact_email && (
                <p className="text-xs text-muted-foreground">{meeting.contact_email}</p>
              )}
              {meeting.contact_phone && (
                <p className="text-xs text-muted-foreground">{meeting.contact_phone}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Location</p>
              <p className="text-sm text-muted-foreground">
                {meeting.office_address || 'N/A'}
              </p>
            </div>
          </div>

          {meeting.workflow_definitions?.name && (
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Workflow</p>
                <p className="text-sm text-muted-foreground">
                  {meeting.workflow_definitions.name}
                </p>
                {meeting.workflow_steps?.step_name && (
                  <p className="text-xs text-muted-foreground">
                    Step: {meeting.workflow_steps.step_name}
                  </p>
                )}
              </div>
            </div>
          )}

          {meeting.scheduled_by_name && (
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Scheduled By</p>
                <p className="text-sm text-muted-foreground">
                  {meeting.scheduled_by_name}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remarks */}
      {(meeting.remarks || meeting.outcome_remarks) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Remarks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {meeting.remarks && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Initial Remarks</p>
                <p className="text-sm">{meeting.remarks}</p>
              </div>
            )}
            {meeting.outcome_remarks && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Outcome Remarks</p>
                <p className="text-sm">{meeting.outcome_remarks}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs for History and API Logs */}
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History ({history.length})
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Globe className="h-4 w-4" />
            API Logs ({apiLogs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-64">
                {history.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No history records
                  </div>
                ) : (
                  <div className="divide-y">
                    {history.map((entry) => (
                      <div key={entry.id} className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{entry.action_taken}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(entry.performed_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        {entry.old_status && (
                          <p className="text-sm text-muted-foreground">
                            {entry.old_status} → {entry.new_status}
                          </p>
                        )}
                        {entry.performed_by_name && (
                          <p className="text-xs text-muted-foreground">
                            By: {entry.performed_by_name}
                          </p>
                        )}
                        {entry.remarks && (
                          <p className="text-sm mt-1">{entry.remarks}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-64">
                {apiLogs.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No API calls recorded
                  </div>
                ) : (
                  <div className="divide-y">
                    {apiLogs.map((log) => (
                      <div key={log.id} className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {log.is_success ? (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                            <span className="font-medium">{log.action_type}</span>
                            {log.response_status && (
                              <Badge variant="outline" className="text-xs">
                                {log.response_status}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        {log.request_url && (
                          <p className="text-xs text-muted-foreground truncate">
                            {log.request_method} {log.request_url}
                          </p>
                        )}
                        {log.duration_ms && (
                          <p className="text-xs text-muted-foreground">
                            Duration: {log.duration_ms}ms
                          </p>
                        )}
                        {log.error_message && (
                          <p className="text-xs text-destructive mt-1">{log.error_message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
