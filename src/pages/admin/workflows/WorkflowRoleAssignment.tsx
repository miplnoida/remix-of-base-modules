import { useState } from 'react';
import { Plus, Trash2, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { useActionPermissions, MODULE_NAMES, ACTION_NAMES } from '@/hooks/useActionPermission';
import {
  useWorkflowRoleAssignments,
  useAssignWorkflowsToRole,
  useRemoveWorkflowRoleAssignment,
} from '@/hooks/useWorkflowRoleAssignments';
import { useDbRoles } from '@/hooks/useRolesData';
import { useWorkflowDefinitions } from '@/hooks/useWorkflows';
import { format } from 'date-fns';

export default function WorkflowRoleAssignment() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedWorkflowIds, setSelectedWorkflowIds] = useState<string[]>([]);

  const { can } = useActionPermissions(MODULE_NAMES.WORKFLOW_MANAGEMENT);
  const { data: assignments, isLoading } = useWorkflowRoleAssignments();
  const { data: roles } = useDbRoles();
  const { data: workflows } = useWorkflowDefinitions();
  const assignMutation = useAssignWorkflowsToRole();
  const removeMutation = useRemoveWorkflowRoleAssignment();

  // Get workflow IDs already assigned to the selected role
  const alreadyAssignedIds = new Set(
    (assignments || [])
      .filter((a) => a.role_id === selectedRoleId)
      .map((a) => a.workflow_id)
  );

  const availableWorkflows = (workflows || []).filter(
    (w) => !alreadyAssignedIds.has(w.id)
  );

  const handleOpenDialog = () => {
    setSelectedRoleId('');
    setSelectedWorkflowIds([]);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedRoleId || selectedWorkflowIds.length === 0) return;
    await assignMutation.mutateAsync({
      roleId: selectedRoleId,
      workflowIds: selectedWorkflowIds,
    });
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await removeMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const toggleWorkflow = (id: string) => {
    setSelectedWorkflowIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Group assignments by role for display
  const grouped = (assignments || []).reduce<
    Record<string, { roleName: string; items: typeof assignments }>
  >((acc, a) => {
    const roleName = a.role?.role_name || 'Unknown';
    if (!acc[a.role_id]) acc[a.role_id] = { roleName, items: [] };
    acc[a.role_id].items!.push(a);
    return acc;
  }, {});

  return (
    <PermissionWrapper moduleName={MODULE_NAMES.WORKFLOW_MANAGEMENT}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Workflow Role Assignment</h1>
              <p className="text-muted-foreground">
                Assign workflows to roles — users only see workflows assigned to their role
              </p>
            </div>
          </div>
          {can(ACTION_NAMES.CREATE) && (
            <Button onClick={handleOpenDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Assign Workflows
            </Button>
          )}
        </div>

        {/* Grouped View */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No assignments configured</h3>
              <p className="text-muted-foreground mt-1">
                Click "Assign Workflows" to map workflows to roles.
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(grouped).map(([roleId, { roleName, items }]) => (
            <Card key={roleId}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  {roleName}
                </CardTitle>
                <CardDescription>
                  {items!.length} workflow(s) assigned
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workflow Name</TableHead>
                      <TableHead>Assigned By</TableHead>
                      <TableHead>Assigned On</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items!.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          {a.workflow?.name || 'Unknown'}
                        </TableCell>
                        <TableCell>{a.assigned_by || '-'}</TableCell>
                        <TableCell>
                          {format(new Date(a.created_at), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">
                          {can(ACTION_NAMES.DELETE) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(a.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}

        {/* Assign Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Assign Workflows to Role</DialogTitle>
              <DialogDescription>
                Select a role and check the workflows to assign
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select
                  value={selectedRoleId}
                  onValueChange={(v) => {
                    setSelectedRoleId(v);
                    setSelectedWorkflowIds([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {(roles || [])
                      .filter((r) => r.is_active)
                      .map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.role_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedRoleId && (
                <div className="space-y-2">
                  <Label>Workflows</Label>
                  {availableWorkflows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      All workflows are already assigned to this role.
                    </p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-3">
                      {availableWorkflows.map((w) => (
                        <div key={w.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`wf-${w.id}`}
                            checked={selectedWorkflowIds.includes(w.id)}
                            onCheckedChange={() => toggleWorkflow(w.id)}
                          />
                          <label
                            htmlFor={`wf-${w.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {w.name}
                            {!w.is_active && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Disabled
                              </Badge>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  !selectedRoleId ||
                  selectedWorkflowIds.length === 0 ||
                  assignMutation.isPending
                }
              >
                {assignMutation.isPending ? 'Saving...' : 'Assign'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Assignment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this workflow assignment? Users with this role
                will no longer be able to see or interact with this workflow.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PermissionWrapper>
  );
}
