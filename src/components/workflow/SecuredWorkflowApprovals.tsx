import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Search, Check, X, Clock, AlertCircle, Shield, Eye, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toast } from 'sonner';
import { 
  useSecuredWorkflowQueue, 
  useValidateWorkflowAction,
  useLogWorkflowSecurityEvent,
  isFieldVisible,
  isFieldEditable,
  maskWorkflowFieldValue,
  getFieldMaskingType
} from "@/hooks/useWorkflowSecurity";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface TaskDetailDialogProps {
  task: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (action: 'approve' | 'reject' | 'query' | 'send_back', comments: string) => Promise<void>;
}

function TaskDetailDialog({ task, open, onOpenChange, onAction }: TaskDetailDialogProps) {
  const [comments, setComments] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const accessDetails = task?.accessDetails;
  const visibleFields = accessDetails?.visible_fields || [];
  const availableActions = accessDetails?.available_actions || [];
  const isAdmin = accessDetails?.is_admin || false;

  const handleAction = async (action: 'approve' | 'reject' | 'query' | 'send_back') => {
    setIsProcessing(true);
    try {
      await onAction(action, comments);
      onOpenChange(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Sample fields to demonstrate field security
  const sampleFields = [
    { name: 'applicant_name', label: 'Applicant Name', value: 'John Doe' },
    { name: 'amount', label: 'Amount', value: '5000.00' },
    { name: 'department', label: 'Department', value: 'Finance' },
    { name: 'ssn', label: 'SSN', value: '123-45-6789' },
    { name: 'salary', label: 'Salary', value: '75000' },
    { name: 'comments', label: 'Comments', value: 'Requesting approval for budget allocation' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {task?.instance?.workflow_name}
            {accessDetails?.secured_table && (
              <Badge variant="outline" className="ml-2">
                <Lock className="h-3 w-3 mr-1" />
                Secured
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {task?.name} - {task?.instance?.source_record_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Security Info */}
          {accessDetails?.secured_table && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Data Access Control Active</AlertTitle>
              <AlertDescription>
                Field visibility and actions are controlled by your data access policies.
              </AlertDescription>
            </Alert>
          )}

          {/* Record Details with Field Security */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Record Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {sampleFields.map((field) => {
                  const visible = isFieldVisible(field.name, visibleFields, isAdmin);
                  const editable = isFieldEditable(field.name, visibleFields, isAdmin);
                  const maskingType = getFieldMaskingType(field.name, visibleFields);

                  if (!visible) return null;

                  const displayValue = maskingType !== 'none' 
                    ? maskWorkflowFieldValue(field.value, maskingType)
                    : field.value;

                  return (
                    <div key={field.name} className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        {field.label}
                        {!editable && <Lock className="h-3 w-3" />}
                      </label>
                      <div className={`p-2 rounded bg-muted ${!editable ? 'opacity-75' : ''}`}>
                        {displayValue}
                        {maskingType !== 'none' && (
                          <Badge variant="outline" className="ml-2 text-xs">Masked</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Comments */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Comments</label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add your comments..."
              rows={3}
            />
          </div>

          {/* Available Actions Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            Available actions: {availableActions.length > 0 ? availableActions.join(', ') : 'View only'}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {availableActions.includes('query') && (
            <Button 
              variant="outline" 
              onClick={() => handleAction('query')}
              disabled={isProcessing}
            >
              Query
            </Button>
          )}
          {availableActions.includes('send_back') && (
            <Button 
              variant="outline" 
              onClick={() => handleAction('send_back')}
              disabled={isProcessing}
            >
              Send Back
            </Button>
          )}
          {availableActions.includes('reject') && (
            <Button 
              variant="destructive" 
              onClick={() => handleAction('reject')}
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
          )}
          {availableActions.includes('approve') && (
            <Button 
              onClick={() => handleAction('approve')}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SecuredWorkflowApprovals() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  
  const { data: tasks, isLoading, refetch } = useSecuredWorkflowQueue();
  const validateAction = useValidateWorkflowAction();
  const logEvent = useLogWorkflowSecurityEvent();

  const filteredTasks = tasks?.filter(
    (task: any) =>
      task.instance?.workflow_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleAction = async (action: 'approve' | 'reject' | 'query' | 'send_back', comments: string) => {
    if (!selectedTask) return;

    try {
      // Validate action with security check
      await validateAction.mutateAsync({
        workflowInstanceId: selectedTask.instance.id,
        action
      });

      // Log the successful action
      await logEvent.mutateAsync({
        workflowInstanceId: selectedTask.instance.id,
        action,
        accessGranted: true,
        fieldsEdited: comments ? ['comments'] : undefined
      });

      toast.success(`Successfully ${action}ed the request`);
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      High: "bg-red-100 text-red-800",
      Medium: "bg-yellow-100 text-yellow-800",
      Low: "bg-green-100 text-green-800",
    };
    return colors[priority] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const pendingCount = tasks?.filter((t: any) => t.status === 'Pending').length || 0;
  const inProgressCount = tasks?.filter((t: any) => t.status === 'InProgress').length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6" />
        <div>
          <h2 className="text-2xl font-bold">Secured Approval Queue</h2>
          <p className="text-sm text-muted-foreground">
            Workflow tasks filtered by your data access policies
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting your action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground">Currently being processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Filtered</CardTitle>
            <Lock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {tasks?.filter((t: any) => t.accessDetails?.secured_table).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Data access controlled</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tasks available based on your data access permissions</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Security</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task: any) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">
                      {task.instance?.workflow_name}
                    </TableCell>
                    <TableCell className="text-sm">{task.name}</TableCell>
                    <TableCell className="text-sm">
                      {task.instance?.source_record_name || task.instance?.source_record_id}
                    </TableCell>
                    <TableCell>
                      <Badge variant={task.status === 'Pending' ? 'outline' : 'default'}>
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.accessDetails?.secured_table ? (
                        <Badge className="bg-green-600">
                          <Lock className="h-3 w-3 mr-1" />
                          Secured
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Open</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTask(task)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {task.accessDetails?.available_actions?.includes('approve') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTask(task)}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
}
