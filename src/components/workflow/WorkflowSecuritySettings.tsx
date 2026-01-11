import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Lock, Edit, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkflowDefinitionsWithSecurity, useUpdateWorkflowSecurity } from '@/hooks/useWorkflowSecurity';
import { useModuleTables } from '@/hooks/useModuleTables';
import { ModuleTreeSelector } from '@/components/data-access/ModuleTreeSelector';

interface EditDialogProps {
  workflow: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditSecurityDialog({ workflow, open, onOpenChange }: EditDialogProps) {
  const [selectedModuleId, setSelectedModuleId] = useState<string>(workflow?.secured_module_id || '');
  const [selectedTable, setSelectedTable] = useState<string>(workflow?.secured_table || '');
  
  const updateSecurity = useUpdateWorkflowSecurity();
  const { data: tables = [], isLoading: tablesLoading } = useModuleTables(selectedModuleId);

  const handleSave = async () => {
    await updateSecurity.mutateAsync({
      workflowId: workflow.id,
      securedModuleId: selectedModuleId || null,
      securedTable: selectedTable || null
    });
    onOpenChange(false);
  };

  const handleModuleSelect = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setSelectedTable(''); // Reset table when module changes
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Configure Security Binding
          </DialogTitle>
          <DialogDescription>
            Bind "{workflow?.name}" to a module and table for data access control
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Secured Module</label>
            <ModuleTreeSelector
              value={selectedModuleId}
              onChange={handleModuleSelect}
              placeholder="Select module..."
            />
            <p className="text-xs text-muted-foreground">
              Select the module this workflow belongs to
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Secured Table</label>
            <Select value={selectedTable} onValueChange={setSelectedTable} disabled={!selectedModuleId || tablesLoading}>
              <SelectTrigger>
                <SelectValue placeholder={tablesLoading ? "Loading tables..." : "Select table..."} />
              </SelectTrigger>
              <SelectContent>
                {tables.map((table: any) => (
                  <SelectItem key={table.table_name} value={table.table_name}>{table.display_name || table.table_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select the database table that represents the business record
            </p>
          </div>

          {!selectedModuleId && !selectedTable && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                Without a security binding, all users with workflow permissions can access all workflow instances.
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateSecurity.isPending}>
            {updateSecurity.isPending ? 'Saving...' : 'Save Binding'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WorkflowSecuritySettings() {
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);
  const { data: workflows, isLoading } = useWorkflowDefinitionsWithSecurity();

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading workflows...</div>;
  }

  const securedCount = workflows?.filter((w: any) => w.secured_table)?.length || 0;
  const unsecuredCount = (workflows?.length || 0) - securedCount;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Workflow Security Bindings
        </h2>
        <p className="text-muted-foreground">
          Configure which module and table each workflow is secured by
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
            <CardTitle className="text-sm font-medium text-green-600">Secured</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{securedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Unsecured</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{unsecuredCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workflow Security Configuration</CardTitle>
          <CardDescription>
            Bind workflows to modules and tables to enforce data access policies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Secured Module</TableHead>
                <TableHead>Secured Table</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows?.map((workflow: any) => (
                <TableRow key={workflow.id}>
                  <TableCell className="font-medium">{workflow.name}</TableCell>
                  <TableCell>
                    {workflow.secured_module?.display_name || (
                      <span className="text-muted-foreground">Not set</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {workflow.secured_table ? (
                      <code className="px-2 py-1 bg-muted rounded text-sm">{workflow.secured_table}</code>
                    ) : (
                      <span className="text-muted-foreground">Not set</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {workflow.secured_table ? (
                      <Badge className="bg-green-600">
                        <Lock className="h-3 w-3 mr-1" />
                        Secured
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Unsecured
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingWorkflow(workflow)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editingWorkflow && (
        <EditSecurityDialog
          workflow={editingWorkflow}
          open={!!editingWorkflow}
          onOpenChange={(open) => !open && setEditingWorkflow(null)}
        />
      )}
    </div>
  );
}
