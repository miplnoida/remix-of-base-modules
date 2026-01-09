import { useState } from 'react';
import { Eye, CheckCircle, XCircle, RotateCcw, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { MODULE_NAMES } from '@/hooks/useActionPermission';
import { useMyWorkflowTasks, useProcessWorkflowTask } from '@/hooks/useWorkflows';
import { format, formatDistanceToNow } from 'date-fns';

export default function MyWorkflowTasks() {
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [actionDialog, setActionDialog] = useState<{ open: boolean; action: string; taskId: string } | null>(null);
  const [comments, setComments] = useState('');

  const { data: tasks, isLoading } = useMyWorkflowTasks();
  const processTask = useProcessWorkflowTask();

  const handleAction = async () => {
    if (!actionDialog) return;
    
    await processTask.mutateAsync({
      taskId: actionDialog.taskId,
      action: actionDialog.action,
      comments,
    });
    
    setActionDialog(null);
    setComments('');
  };

  const openActionDialog = (action: string, taskId: string) => {
    setActionDialog({ open: true, action, taskId });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'InProgress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'Completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      default:
        return '';
    }
  };

  const isOverdue = (dueAt: string | null) => {
    if (!dueAt) return false;
    return new Date(dueAt) < new Date();
  };

  return (
    <PermissionWrapper moduleName={MODULE_NAMES.WORKFLOW_TASKS}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Workflow Tasks</h1>
          <p className="text-muted-foreground">View and process your assigned workflow tasks</p>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Source Record</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  </TableRow>
                ))
              ) : tasks?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No pending tasks assigned to you.
                  </TableCell>
                </TableRow>
              ) : (
                tasks?.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">
                      {task.workflow_instance?.workflow_name || 'Unknown'}
                    </TableCell>
                    <TableCell>{task.step_name}</TableCell>
                    <TableCell>
                      {task.workflow_instance?.source_record_name || task.workflow_instance?.source_record_id || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.due_at ? (
                        <span className={isOverdue(task.due_at) ? 'text-destructive' : ''}>
                          {formatDistanceToNow(new Date(task.due_at), { addSuffix: true })}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedTask(task)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openActionDialog('Approve', task.id)}
                          title="Approve"
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openActionDialog('Reject', task.id)}
                          title="Reject"
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openActionDialog('SendBack', task.id)}
                          title="Send Back"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openActionDialog('Escalate', task.id)}
                          title="Escalate"
                          className="text-orange-600 hover:text-orange-700"
                        >
                          <ArrowUpCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Task Details Dialog */}
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Task Details</DialogTitle>
              <DialogDescription>
                View complete information about this workflow task
              </DialogDescription>
            </DialogHeader>
            {selectedTask && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">Workflow</Label>
                    <p className="font-medium">{selectedTask.workflow_instance?.workflow_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Current Step</Label>
                    <p className="font-medium">{selectedTask.step_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Status</Label>
                    <Badge className={getStatusColor(selectedTask.status)}>
                      {selectedTask.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Due Date</Label>
                    <p className={`font-medium ${isOverdue(selectedTask.due_at) ? 'text-destructive' : ''}`}>
                      {selectedTask.due_at 
                        ? format(new Date(selectedTask.due_at), 'MMM dd, yyyy HH:mm')
                        : 'No due date'
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Source Module</Label>
                    <p className="font-medium">{selectedTask.workflow_instance?.source_module || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Source Record</Label>
                    <p className="font-medium">{selectedTask.workflow_instance?.source_record_name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Started By</Label>
                    <p className="font-medium">{selectedTask.workflow_instance?.started_by_name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Started At</Label>
                    <p className="font-medium">
                      {selectedTask.workflow_instance?.started_at 
                        ? format(new Date(selectedTask.workflow_instance.started_at), 'MMM dd, yyyy HH:mm')
                        : '-'
                      }
                    </p>
                  </div>
                </div>
                
                {selectedTask.workflow_instance?.metadata && Object.keys(selectedTask.workflow_instance.metadata).length > 0 && (
                  <div>
                    <Label className="text-muted-foreground text-sm">Additional Data</Label>
                    <pre className="mt-1 p-3 bg-muted rounded-md text-sm overflow-auto">
                      {JSON.stringify(selectedTask.workflow_instance.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedTask(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Action Dialog */}
        <Dialog open={!!actionDialog?.open} onOpenChange={() => setActionDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionDialog?.action === 'Approve' && 'Approve Task'}
                {actionDialog?.action === 'Reject' && 'Reject Task'}
                {actionDialog?.action === 'SendBack' && 'Send Back Task'}
                {actionDialog?.action === 'Escalate' && 'Escalate Task'}
              </DialogTitle>
              <DialogDescription>
                {actionDialog?.action === 'Approve' && 'Approve this task and move to the next step'}
                {actionDialog?.action === 'Reject' && 'Reject this task and end the workflow'}
                {actionDialog?.action === 'SendBack' && 'Send this task back to the previous step'}
                {actionDialog?.action === 'Escalate' && 'Escalate this task to a higher authority'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Comments (optional)</Label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add any comments or notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialog(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={processTask.isPending}
                variant={actionDialog?.action === 'Reject' ? 'destructive' : 'default'}
              >
                {actionDialog?.action}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionWrapper>
  );
}
