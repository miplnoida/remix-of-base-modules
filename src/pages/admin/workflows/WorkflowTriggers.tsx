import { useState } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { useActionPermissions, MODULE_NAMES, ACTION_NAMES } from '@/hooks/useActionPermission';
import {
  useWorkflowTriggers,
  useWorkflowDefinitions,
  useSaveWorkflowTrigger,
  useDeleteWorkflowTrigger,
} from '@/hooks/useWorkflows';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface TriggerFormData {
  id?: string;
  module_id: string;
  action_name: string;
  workflow_id: string;
  is_active: boolean;
}

export default function WorkflowTriggers() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TriggerFormData>({
    module_id: '',
    action_name: '',
    workflow_id: '',
    is_active: true,
  });

  const { can } = useActionPermissions(MODULE_NAMES.WORKFLOW_TRIGGERS);
  const { data: triggers, isLoading } = useWorkflowTriggers();
  const { data: workflows } = useWorkflowDefinitions();
  const { data: modules } = useQuery({
    queryKey: ['app-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_modules')
        .select('id, name, display_name')
        .eq('is_enabled', true)
        .order('display_name');
      if (error) throw error;
      return data;
    },
  });

  // Query for module actions based on selected module
  const { data: moduleActions, isLoading: isLoadingActions } = useQuery({
    queryKey: ['module-actions', formData.module_id],
    queryFn: async () => {
      if (!formData.module_id) return [];
      const { data, error } = await supabase
        .from('module_actions')
        .select('id, action_name, display_name')
        .eq('module_id', formData.module_id)
        .eq('is_enabled', true)
        .order('display_name');
      if (error) throw error;
      return data;
    },
    enabled: !!formData.module_id,
  });

  const saveTrigger = useSaveWorkflowTrigger();
  const deleteTrigger = useDeleteWorkflowTrigger();

  const handleOpenDialog = (trigger?: any) => {
    if (trigger) {
      setFormData({
        id: trigger.id,
        module_id: trigger.module_id || '',
        action_name: trigger.action_name,
        workflow_id: trigger.workflow_id,
        is_active: trigger.is_active,
      });
    } else {
      setFormData({
        module_id: '',
        action_name: '',
        workflow_id: '',
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    await saveTrigger.mutateAsync(formData);
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTrigger.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const activeWorkflows = workflows?.filter(w => w.is_active) || [];

  return (
    <PermissionWrapper moduleName={MODULE_NAMES.WORKFLOW_TRIGGERS}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Workflow Triggers</h1>
            <p className="text-muted-foreground">Bind workflows to module actions</p>
          </div>
          {can(ACTION_NAMES.CREATE) && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Trigger
            </Button>
          )}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : triggers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No triggers configured. Click "Add Trigger" to bind a workflow to a module action.
                  </TableCell>
                </TableRow>
              ) : (
                triggers?.map((trigger: any) => (
                  <TableRow key={trigger.id}>
                    <TableCell>{trigger.module?.display_name || 'Unknown'}</TableCell>
                    <TableCell>{trigger.action_name}</TableCell>
                    <TableCell>{trigger.workflow?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge variant={trigger.is_active ? 'default' : 'secondary'}>
                        {trigger.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(trigger.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {can(ACTION_NAMES.EDIT) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(trigger)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {can(ACTION_NAMES.DELETE) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(trigger.id)}
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

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{formData.id ? 'Edit Trigger' : 'Add Trigger'}</DialogTitle>
              <DialogDescription>
                Bind a workflow to a module action
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Module *</Label>
                <Select
                  value={formData.module_id}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    module_id: value,
                    action_name: '' // Reset action when module changes
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    {modules?.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Action Name *</Label>
                <Select
                  value={formData.action_name}
                  onValueChange={(value) => setFormData({ ...formData, action_name: value })}
                  disabled={!formData.module_id || isLoadingActions}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !formData.module_id 
                        ? "Select a module first" 
                        : isLoadingActions 
                          ? "Loading actions..." 
                          : "Select action"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {moduleActions?.map((action) => (
                      <SelectItem key={action.id} value={action.action_name}>
                        {action.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Workflow *</Label>
                <Select
                  value={formData.workflow_id}
                  onValueChange={(value) => setFormData({ ...formData, workflow_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select workflow" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeWorkflows.map((workflow) => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        {workflow.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.module_id || !formData.action_name || !formData.workflow_id}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Trigger</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this trigger? This action cannot be undone.
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
