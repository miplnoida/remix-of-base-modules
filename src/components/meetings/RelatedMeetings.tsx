import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link2, ExternalLink } from 'lucide-react';
import type { MeetingStatus } from '@/types/meetings';

interface RelatedMeeting {
  id: string;
  meeting_reference: string;
  meeting_date: string;
  meeting_time: string;
  status: MeetingStatus;
  parent_meeting_id: string | null;
}

const statusColors: Record<MeetingStatus, string> = {
  'Scheduled': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'Rescheduled': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  'InProgress': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'Closed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Cancelled': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  'Rejected': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
};

interface RelatedMeetingsProps {
  meetingId: string;
  applicationReference: string;
  onMeetingClick: (meetingId: string) => void;
}

export function RelatedMeetings({ meetingId, applicationReference, onMeetingClick }: RelatedMeetingsProps) {
  const { data: relatedMeetings, isLoading } = useQuery({
    queryKey: ['related-meetings', applicationReference],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('id, meeting_reference, meeting_date, meeting_time, status, parent_meeting_id')
        .eq('application_reference', applicationReference)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as RelatedMeeting[];
    },
    enabled: !!applicationReference,
    staleTime: 15000
  });

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  // Only show if there are other meetings for this application
  const otherMeetings = relatedMeetings?.filter(m => m.id !== meetingId) || [];
  if (otherMeetings.length === 0) return null;

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
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Related Meetings ({otherMeetings.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {otherMeetings.map((m) => (
            <button
              key={m.id}
              onClick={() => onMeetingClick(m.id)}
              className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{m.meeting_reference}</span>
                  <Badge className={statusColors[m.status]} variant="secondary">
                    {m.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(m.meeting_date), 'MMM d, yyyy')} at {formatTime(m.meeting_time)}
                </p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
