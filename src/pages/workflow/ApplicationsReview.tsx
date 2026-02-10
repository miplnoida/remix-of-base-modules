import React, { useState } from 'react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { 
  ClipboardCheck, 
  Search, 
  Filter, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  MessageSquare,
  Eye,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { 
  useApplicationsForReview, 
  useReviewStepNames, 
  useProcessReviewAction,
  ApplicationForReview,
  NextStepType,
  EndState
} from '@/hooks/useApplicationsReview';

const ApplicationsReview: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    stepName: '',
    status: '',
  });
  const [selectedTask, setSelectedTask] = useState<ApplicationForReview | null>(null);
  const [selectedAction, setSelectedAction] = useState<{
    id: string;
    name: string;
    type: string;
    nextStepType: NextStepType;
    nextStepId: string | null;
    endState: EndState;
    isFinalAction: boolean;
    remarksRequired: boolean;
  } | null>(null);
  const [comments, setComments] = useState('');
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  
  const { data: applications, isLoading, refetch } = useApplicationsForReview(filters);
  const { data: stepNames } = useReviewStepNames();
  const processAction = useProcessReviewAction();

  const handleOpenActionModal = (
    task: ApplicationForReview, 
    action: { 
      id: string; 
      action_name: string; 
      action_type: string; 
      next_step_type: NextStepType;
      next_step_id: string | null; 
      end_state: EndState;
      is_final_action: boolean;
      remarks_required?: boolean;
    }
  ) => {
    setSelectedTask(task);
    setSelectedAction({
      id: action.id,
      name: action.action_name,
      type: action.action_type,
      nextStepType: action.next_step_type || 'next_step',
      nextStepId: action.next_step_id,
      endState: action.end_state,
      isFinalAction: action.is_final_action,
      remarksRequired: action.remarks_required ?? false,
    });
    setComments('');
    setIsActionModalOpen(true);
  };

  const handleProcessAction = async () => {
    if (!selectedTask || !selectedAction) return;
    
    await processAction.mutateAsync({
      taskId: selectedTask.id,
      actionId: selectedAction.id,
      actionName: selectedAction.name,
      actionType: selectedAction.type,
      nextStepType: selectedAction.nextStepType,
      nextStepId: selectedAction.nextStepId,
      endState: selectedAction.endState,
      isFinalAction: selectedAction.isFinalAction,
      comments: comments || undefined,
    });
    
    setIsActionModalOpen(false);
    setSelectedTask(null);
    setSelectedAction(null);
    setComments('');
    refetch();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'InProgress':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">In Progress</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActionButtonVariant = (actionType: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (actionType) {
      case 'approve':
        return 'default';
      case 'reject':
        return 'destructive';
      case 'return':
      case 'request_info':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'approve':
        return <CheckCircle2 className="h-4 w-4 mr-1" />;
      case 'reject':
        return <XCircle className="h-4 w-4 mr-1" />;
      case 'forward':
        return <ArrowRight className="h-4 w-4 mr-1" />;
      case 'request_info':
        return <MessageSquare className="h-4 w-4 mr-1" />;
      default:
        return null;
    }
  };

  const isDueSoon = (dueAt: string | null) => {
    if (!dueAt) return false;
    const dueDate = new Date(dueAt);
    const now = new Date();
    const hoursRemaining = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursRemaining <= 24 && hoursRemaining > 0;
  };

  const isOverdue = (dueAt: string | null) => {
    if (!dueAt) return false;
    return isPast(new Date(dueAt));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Applications for Review</h1>
            <p className="text-muted-foreground">
              Review and process pending workflow applications
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by application name, workflow..."
                  className="pl-9"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
            </div>
            <Select
              value={filters.stepName || '__all__'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, stepName: value === '__all__' ? '' : value }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Step" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Steps</SelectItem>
                {stepNames?.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.status || '__all__'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === '__all__' ? '' : value }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="InProgress">In Progress</SelectItem>
              </SelectContent>
            </Select>
            {(filters.search || filters.stepName || filters.status) && (
              <Button 
                variant="ghost" 
                onClick={() => setFilters({ search: '', stepName: '', status: '' })}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Applications</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading...' : `${applications?.length || 0} application(s) pending your review`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : applications && applications.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Current Step</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>SLA/Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div className="font-medium">
                        {app.workflow_instance?.source_record_name || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {app.workflow_instance?.source_record_id?.slice(0, 8)}...
                      </div>
                    </TableCell>
                    <TableCell>{app.workflow_instance?.workflow_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{app.step_name}</Badge>
                    </TableCell>
                    <TableCell>
                      {app.assigned_to_name || app.assigned_role || app.assigned_designation || 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      {app.workflow_instance?.started_at && (
                        <div className="text-sm">
                          {format(new Date(app.workflow_instance.started_at), 'MMM d, yyyy')}
                          <div className="text-xs text-muted-foreground">
                            by {app.workflow_instance.started_by_name || 'Unknown'}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {app.due_at ? (
                        <div className="flex items-center gap-1">
                          {isOverdue(app.due_at) ? (
                            <>
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                              <span className="text-destructive text-sm">
                                Overdue
                              </span>
                            </>
                          ) : isDueSoon(app.due_at) ? (
                            <>
                              <Clock className="h-4 w-4 text-yellow-600" />
                              <span className="text-yellow-600 text-sm">
                                {formatDistanceToNow(new Date(app.due_at), { addSuffix: true })}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(app.due_at), 'MMM d, HH:mm')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(app.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {app.workflow_instance?.source_record_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/sample-applications/${app.workflow_instance?.source_record_id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {app.step_actions.map((action) => (
                          <Button
                            key={action.id}
                            variant={getActionButtonVariant(action.action_type)}
                            size="sm"
                            onClick={() => handleOpenActionModal(app, action)}
                          >
                            {getActionIcon(action.action_type)}
                            {action.action_name}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No applications pending your review</h3>
              <p className="text-muted-foreground mt-1">
                When applications are assigned to you or your role, they will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Modal */}
      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAction && getActionIcon(selectedAction.type)}
              {selectedAction?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedTask && (
                <>
                  Processing action for: <strong>{selectedTask.workflow_instance?.source_record_name}</strong>
                  <br />
                  Current Step: <strong>{selectedTask.step_name}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comments">
                Comments {selectedAction?.remarksRequired ? <span className="text-destructive">*</span> : '(Optional)'}
              </Label>
              <Textarea
                id="comments"
                placeholder={selectedAction?.remarksRequired 
                  ? "Comments are required for this action..." 
                  : "Add any comments or notes about this action..."}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                className={selectedAction?.remarksRequired && !comments.trim() ? 'border-destructive' : ''}
              />
              {selectedAction?.remarksRequired && !comments.trim() && (
                <p className="text-xs text-destructive">Reviewer comments are mandatory for this action</p>
              )}
            </div>
            {selectedAction?.type === 'reject' && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                This action will reject the application and close the workflow.
              </div>
            )}
            {selectedAction?.isFinalAction && selectedAction?.type === 'approve' && (
              <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4 inline mr-2" />
                This is the final approval step. The application will be marked as completed.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={selectedAction?.type === 'reject' ? 'destructive' : 'default'}
              onClick={handleProcessAction}
              disabled={processAction.isPending || (selectedAction?.remarksRequired && !comments.trim())}
            >
              {processAction.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Confirm ${selectedAction?.name}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplicationsReview;
