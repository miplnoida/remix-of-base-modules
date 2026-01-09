import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useSampleApplication } from '@/hooks/useSampleApplications';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function SampleApplicationView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const { data: application, isLoading } = useSampleApplication(id);
  
  // Fetch workflow history
  const { data: workflowLogs } = useQuery({
    queryKey: ['workflow-logs-for-app', application?.workflow_instance_id],
    queryFn: async () => {
      if (!application?.workflow_instance_id) return [];
      
      const { data, error } = await supabase
        .from('workflow_logs')
        .select('*')
        .eq('instance_id', application.workflow_instance_id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!application?.workflow_instance_id,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Draft':
        return <Clock className="h-5 w-5 text-gray-500" />;
      case 'Submitted':
      case 'UnderReview':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'MoreInfoRequested':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'Approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'Rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
      case 'Submitted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'UnderReview':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'MoreInfoRequested':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100';
      case 'Approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'Rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default:
        return '';
    }
  };

  const canEdit = application?.status === 'Draft' || application?.status === 'MoreInfoRequested';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Application not found</h2>
        <Button variant="link" onClick={() => navigate('/sample-applications')}>
          Back to Applications
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/sample-applications')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{application.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              {getStatusIcon(application.status)}
              <Badge className={getStatusColor(application.status)}>
                {application.status === 'MoreInfoRequested' ? 'More Info Requested' : application.status}
              </Badge>
            </div>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => navigate(`/sample-applications/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            {application.status === 'MoreInfoRequested' ? 'Provide More Info' : 'Edit'}
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Application Details</CardTitle>
            <CardDescription>Information provided in the application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="text-foreground">{application.description || 'No description provided'}</p>
            </div>
            
            <Separator />
            
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-2xl font-bold text-foreground">
                ${application.amount?.toLocaleString()}
              </p>
            </div>
            
            <Separator />
            
            <div>
              <p className="text-sm text-muted-foreground">Applicant Comments</p>
              <p className="text-foreground">{application.applicant_comments || 'No comments'}</p>
            </div>

            {application.rejection_reason && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Rejection Reason</p>
                  <p className="text-destructive">{application.rejection_reason}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Application status history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(application.created_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>
              
              {application.submitted_at && (
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Submitted</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(application.submitted_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              )}

              {workflowLogs?.map((log: any) => (
                <div key={log.id} className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    log.action === 'Approve' ? 'bg-green-500' :
                    log.action === 'Reject' ? 'bg-red-500' :
                    log.action === 'SendBack' ? 'bg-orange-500' :
                    'bg-gray-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium">
                      {log.step_name}: {log.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.user_name} - {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                    {log.comments && (
                      <p className="text-xs text-muted-foreground italic">{log.comments}</p>
                    )}
                  </div>
                </div>
              ))}

              {application.completed_at && application.status === 'Approved' && (
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <div>
                    <p className="text-sm font-medium text-green-600">Approved</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(application.completed_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              )}

              {application.completed_at && application.status === 'Rejected' && (
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <div>
                    <p className="text-sm font-medium text-red-600">Rejected</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(application.completed_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
