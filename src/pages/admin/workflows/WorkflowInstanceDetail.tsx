import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  History, 
  CheckCircle2, 
  Clock, 
  XCircle,
  User,
  Calendar,
  FileText,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  useWorkflowInstanceDetail, 
  useWorkflowInstanceHistory,
  useWorkflowInstanceTasks 
} from '@/hooks/useWorkflowInstances';

const WorkflowInstanceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: instance, isLoading: instanceLoading } = useWorkflowInstanceDetail(id || null);
  const { data: history, isLoading: historyLoading } = useWorkflowInstanceHistory(id || null);
  const { data: tasks } = useWorkflowInstanceTasks(id || null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'InProgress':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">In Progress</Badge>;
      case 'Completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'Rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      case 'Cancelled':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActionIcon = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('approve') || actionLower.includes('complete')) {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    if (actionLower.includes('reject')) {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    if (actionLower.includes('start')) {
      return <Clock className="h-4 w-4 text-blue-600" />;
    }
    return <History className="h-4 w-4 text-muted-foreground" />;
  };

  if (instanceLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate('/admin/workflow-instances')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Instances
        </Button>
        <div className="mt-8 text-center">
          <h2 className="text-xl font-semibold">Instance not found</h2>
          <p className="text-muted-foreground mt-2">
            The requested workflow instance does not exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/workflow-instances')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{instance.workflow_name}</h1>
            <p className="text-muted-foreground">
              Instance ID: {instance.id.slice(0, 8)}...
            </p>
          </div>
        </div>
        {getStatusBadge(instance.status)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Instance Details */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Instance Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium">Application</div>
                <div className="text-sm text-muted-foreground">
                  {instance.source_record_name || 'N/A'}
                </div>
                {instance.source_record_id && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 mt-1"
                    onClick={() => navigate(`/sample-applications/${instance.source_record_id}`)}
                  >
                    View Application
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium">Initiated By</div>
                <div className="text-sm text-muted-foreground">
                  {instance.started_by_name || 'System'}
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium">Started</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(instance.started_at), 'PPpp')}
                </div>
              </div>
            </div>
            
            {instance.completed_at && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Completed</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(instance.completed_at), 'PPpp')}
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {instance.due_at && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Due Date</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(instance.due_at), 'PPpp')}
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {instance.current_step_name && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <History className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Current Step</div>
                    <Badge variant="secondary" className="mt-1">
                      {instance.current_step_name}
                    </Badge>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Workflow History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Workflow History
            </CardTitle>
            <CardDescription>
              Complete timeline of actions taken on this workflow instance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : history && history.length > 0 ? (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                
                <div className="space-y-6">
                  {history.map((entry, index) => (
                    <div key={entry.id} className="relative pl-10">
                      {/* Timeline dot */}
                      <div className="absolute left-2 top-1 w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                        {getActionIcon(entry.action)}
                      </div>
                      
                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{entry.action}</div>
                            {entry.step_name && (
                              <Badge variant="outline" className="mt-1">
                                {entry.step_name}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(entry.created_at), 'PPp')}
                          </div>
                        </div>
                        
                        <div className="mt-2 text-sm text-muted-foreground">
                          <span className="font-medium">By:</span> {entry.user_name || 'System'}
                        </div>
                        
                        {entry.comments && (
                          <div className="mt-2 text-sm bg-background rounded p-2 border">
                            <span className="font-medium">Comments:</span> {entry.comments}
                          </div>
                        )}
                        
                        {(entry.old_status || entry.new_status) && (
                          <div className="mt-2 text-sm">
                            {entry.old_status && (
                              <Badge variant="outline" className="mr-2">
                                From: {entry.old_status}
                              </Badge>
                            )}
                            {entry.new_status && (
                              <Badge variant="outline">
                                To: {entry.new_status}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No history available for this workflow instance.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tasks Summary */}
      {tasks && tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tasks Summary</CardTitle>
            <CardDescription>
              All tasks created for this workflow instance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map((task) => {
                // Determine the pending approver display text
                const getPendingApproverText = () => {
                  // If directly assigned to a user
                  if (task.assigned_to_name) {
                    return { type: 'User', value: task.assigned_to_name };
                  }
                  
                  // Check approver_type configuration
                  if (task.approver_type === 'role') {
                    const roleNames = task.approver_role_names || [];
                    if (roleNames.length > 0) {
                      return { type: 'Role', value: roleNames.join(', ') };
                    }
                    // Fallback to assigned_role if no role names resolved
                    if (task.assigned_role) {
                      return { type: 'Role', value: task.assigned_role };
                    }
                  }
                  
                  if (task.approver_type === 'designation') {
                    const designationNames = task.approver_designation_names || [];
                    if (designationNames.length > 0) {
                      return { type: 'Designation', value: designationNames.join(', ') };
                    }
                    if (task.assigned_designation) {
                      return { type: 'Designation', value: task.assigned_designation };
                    }
                  }
                  
                  if (task.approver_type === 'user') {
                    const userNames = task.approver_user_names || [];
                    if (userNames.length > 0) {
                      return { type: 'User', value: userNames.join(', ') };
                    }
                  }
                  
                  // Fallback to task-level assignment
                  if (task.assigned_role) {
                    return { type: 'Role', value: task.assigned_role };
                  }
                  if (task.assigned_designation) {
                    return { type: 'Designation', value: task.assigned_designation };
                  }
                  
                  return { type: null, value: 'Unassigned' };
                };
                
                const approverInfo = getPendingApproverText();
                
                return (
                  <div 
                    key={task.id} 
                    className="border rounded-lg p-4 bg-muted/30"
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-medium">{task.step_name}</div>
                      {getStatusBadge(task.status)}
                    </div>
                    <div className="mt-2 space-y-1">
                      {approverInfo.type && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Approver Type:</span> {approverInfo.type}
                        </div>
                      )}
                      <div className="text-sm">
                        <span className="font-medium text-muted-foreground">Pending:</span>{' '}
                        <span className={approverInfo.value === 'Unassigned' ? 'text-amber-600' : 'text-foreground'}>
                          {approverInfo.value}
                        </span>
                      </div>
                    </div>
                    {task.action_taken && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium">Action:</span> {task.action_taken}
                      </div>
                    )}
                    {task.completed_at && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Completed: {format(new Date(task.completed_at), 'PPp')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WorkflowInstanceDetail;
