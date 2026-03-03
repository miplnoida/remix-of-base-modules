import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Shield, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useModuleTables } from '@/hooks/useModuleTables';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { MODULE_NAMES } from '@/hooks/useActionPermission';

interface WorkflowWithSecurity {
  id: string;
  name: string;
  process_type: string;
  is_active: boolean;
  secured_module_id: string | null;
  secured_table: string | null;
  module_name?: string;
}

function useWorkflowDefinitionsWithSecurity() {
  return useQuery({
    queryKey: ['workflow-definitions-security'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_definitions')
        .select(`
          id,
          name,
          process_type,
          is_active,
          secured_module_id,
          secured_table,
          app_modules!workflow_definitions_secured_module_id_fkey(display_name)
        `)
        .order('name');

      if (error) throw error;

      return (data || []).map((w: any) => ({
        id: w.id,
        name: w.name,
        process_type: w.process_type,
        is_active: w.is_active,
        secured_module_id: w.secured_module_id,
        secured_table: w.secured_table,
        module_name: w.app_modules?.display_name || null,
      })) as WorkflowWithSecurity[];
    },
  });
}

function useUpdateWorkflowSecurity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflowId,
      secured_module_id,
      secured_table,
    }: {
      workflowId: string;
      secured_module_id: string | null;
      secured_table: string | null;
    }) => {
      const { error } = await supabase
        .from('workflow_definitions')
        .update({
          secured_module_id,
          secured_table,
        })
        .eq('id', workflowId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-definitions-security'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-definitions'] });
      toast({ title: 'Success', description: 'Workflow security settings updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

interface EditDialogProps {
  workflow: WorkflowWithSecurity | null;
  onClose: () => void;
}

function EditSecurityDialog({ workflow, onClose }: EditDialogProps) {
  const [selectedModuleId, setSelectedModuleId] = useState<string>(workflow?.secured_module_id || '');
  const [selectedTable, setSelectedTable] = useState<string>(workflow?.secured_table || '');

  const { data: modules } = useQuery({
    queryKey: ['parent-modules-for-security'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_modules')
        .select('id, display_name')
        .is('parent_id', null)
        .eq('is_enabled', true)
        .order('display_name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: tables } = useModuleTables(selectedModuleId || undefined);
  const updateSecurity = useUpdateWorkflowSecurity();

  const handleSave = () => {
    if (!workflow) return;
    updateSecurity.mutate(
      {
        workflowId: workflow.id,
        secured_module_id: selectedModuleId || null,
        secured_table: selectedTable || null,
      },
      { onSuccess: onClose }
    );
  };

  if (!workflow) return null;

  return (
    <Dialog open={!!workflow} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Security Binding - {workflow.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Secured Module</Label>
            <Select
              value={selectedModuleId}
              onValueChange={(value) => {
                setSelectedModuleId(value);
                setSelectedTable('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select module (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {modules?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Secured Table</Label>
            <Select
              value={selectedTable}
              onValueChange={setSelectedTable}
              disabled={!selectedModuleId}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedModuleId ? 'Select table' : 'Select a module first'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {tables?.map((t) => (
                  <SelectItem key={t.table_name} value={t.table_name}>
                    {t.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedModuleId && selectedTable && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm">
                <strong>Security will be enforced:</strong> Data access policies for this table
                will filter workflow tasks and approval queue visibility.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateSecurity.isPending}>
            {updateSecurity.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WorkflowSecuritySettings() {
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowWithSecurity | null>(null);
  const { data: workflows, isLoading } = useWorkflowDefinitionsWithSecurity();

  const securedCount = workflows?.filter((w) => w.secured_module_id && w.secured_table).length || 0;
  const unsecuredCount = (workflows?.length || 0) - securedCount;

  return (
    <PermissionWrapper moduleName={MODULE_NAMES.WORKFLOW_MANAGEMENT}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Workflow Security Settings</h1>
          <p className="text-muted-foreground">
            Bind workflows to modules and tables to enforce data access policies on workflow tasks
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workflows?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-500" />
                Secured
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{securedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Unlock className="h-4 w-4 text-amber-500" />
                Unsecured
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{unsecuredCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Workflows Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Workflow Security Bindings
            </CardTitle>
            <CardDescription>
              Configure which module/table each workflow is secured against for data access control
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow Name</TableHead>
                  <TableHead>Process Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Secured Module</TableHead>
                  <TableHead>Secured Table</TableHead>
                  <TableHead>Security Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : workflows?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No workflows found
                    </TableCell>
                  </TableRow>
                ) : (
                  workflows?.map((workflow) => (
                    <TableRow key={workflow.id}>
                      <TableCell className="font-medium">{workflow.name}</TableCell>
                      <TableCell>{workflow.process_type}</TableCell>
                      <TableCell>
                        <Badge variant={workflow.is_active ? 'default' : 'secondary'}>
                          {workflow.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{workflow.module_name || '-'}</TableCell>
                      <TableCell>{workflow.secured_table || '-'}</TableCell>
                      <TableCell>
                        {workflow.secured_module_id && workflow.secured_table ? (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                            <Lock className="h-3 w-3 mr-1" />
                            Secured
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Unsecured
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditingWorkflow(workflow)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <EditSecurityDialog workflow={editingWorkflow} onClose={() => setEditingWorkflow(null)} />
      </div>
    </PermissionWrapper>
  );
}