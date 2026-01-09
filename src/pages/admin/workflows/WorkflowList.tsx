import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Power, Trash2, FileText, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { useActionPermissions, MODULE_NAMES, ACTION_NAMES } from '@/hooks/useActionPermission';
import {
  useWorkflowDefinitions,
  useDeleteWorkflow,
  useToggleWorkflowStatus,
} from '@/hooks/useWorkflows';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function WorkflowList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { can } = useActionPermissions(MODULE_NAMES.WORKFLOW_MANAGEMENT);
  const { data: workflows, isLoading } = useWorkflowDefinitions();
  const deleteWorkflow = useDeleteWorkflow();
  const toggleStatus = useToggleWorkflowStatus();
  
  const filteredWorkflows = workflows?.filter(w =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.process_type.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  const handleDelete = async () => {
    if (deleteId) {
      await deleteWorkflow.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };
  
  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    await toggleStatus.mutateAsync({ id, is_active: !currentStatus });
  };

  return (
    <PermissionWrapper moduleName={MODULE_NAMES.WORKFLOW_MANAGEMENT}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Workflow Management</h1>
            <p className="text-muted-foreground">Design and manage approval workflows</p>
          </div>
          <div className="flex gap-2">
            {can(ACTION_NAMES.VIEW_LOGS) && (
              <Button variant="outline" onClick={() => navigate('/admin/workflow-logs')}>
                <FileText className="h-4 w-4 mr-2" />
                View Logs
              </Button>
            )}
            {can(ACTION_NAMES.VIEW_ANALYTICS) && (
              <Button variant="outline" onClick={() => navigate('/admin/workflow-analytics')}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            )}
            {can(ACTION_NAMES.CREATE) && (
              <Button onClick={() => navigate('/admin/workflows/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <Input
            placeholder="Search workflows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow Name</TableHead>
                <TableHead>Process Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : filteredWorkflows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No workflows found. Create your first workflow to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredWorkflows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell className="font-medium">{workflow.name}</TableCell>
                    <TableCell>{workflow.process_type}</TableCell>
                    <TableCell>
                      <Badge variant={workflow.is_active ? 'default' : 'secondary'}>
                        {workflow.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell>v{workflow.version}</TableCell>
                    <TableCell>
                      {format(new Date(workflow.updated_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {can(ACTION_NAMES.EDIT) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/admin/workflows/${workflow.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {can(ACTION_NAMES.DISABLE) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleStatus(workflow.id, workflow.is_active)}
                          >
                            <Power className={`h-4 w-4 ${workflow.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                          </Button>
                        )}
                        {can(ACTION_NAMES.DELETE) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(workflow.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this workflow? This action cannot be undone.
                Workflows with existing instances cannot be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PermissionWrapper>
  );
}
