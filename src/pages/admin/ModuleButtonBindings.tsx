import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Link2, Unlink, Loader2, Settings2, MousePointer } from 'lucide-react';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { MODULE_NAMES } from '@/hooks/useActionPermission';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface AppModule {
  id: string;
  name: string;
  display_name: string;
}

interface ModuleAction {
  id: string;
  module_id: string;
  action_name: string;
  display_name: string;
  is_enabled: boolean;
}

interface ButtonBinding {
  id: string;
  module_id: string;
  action_id: string;
  button_key: string;
  button_label: string;
  created_at: string;
  module?: AppModule;
  action?: ModuleAction;
}

// Predefined screen buttons that can be bound
const SCREEN_BUTTONS = [
  { key: 'btn_create', label: 'Create/Add New', description: 'Button to create new records' },
  { key: 'btn_edit', label: 'Edit', description: 'Button to edit existing records' },
  { key: 'btn_delete', label: 'Delete', description: 'Button to delete records' },
  { key: 'btn_view', label: 'View Details', description: 'Button to view record details' },
  { key: 'btn_submit', label: 'Submit', description: 'Button to submit for approval' },
  { key: 'btn_approve', label: 'Approve', description: 'Button to approve records' },
  { key: 'btn_reject', label: 'Reject', description: 'Button to reject records' },
  { key: 'btn_export', label: 'Export', description: 'Button to export data' },
  { key: 'btn_import', label: 'Import', description: 'Button to import data' },
  { key: 'btn_print', label: 'Print', description: 'Button to print records' },
  { key: 'btn_download', label: 'Download', description: 'Button to download files' },
  { key: 'btn_upload', label: 'Upload', description: 'Button to upload files' },
  { key: 'btn_verify', label: 'Verify', description: 'Button to verify records' },
  { key: 'btn_cancel', label: 'Cancel', description: 'Button to cancel operations' },
  { key: 'btn_revert', label: 'Revert', description: 'Button to revert changes' },
  { key: 'btn_save', label: 'Save', description: 'Button to save changes' },
  { key: 'btn_save_draft', label: 'Save as Draft', description: 'Button to save as draft' },
];

function ModuleButtonBindingsContent() {
  const queryClient = useQueryClient();
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [selectedActionId, setSelectedActionId] = useState<string>('');
  const [selectedButtonKey, setSelectedButtonKey] = useState<string>('');
  const [customButtonLabel, setCustomButtonLabel] = useState<string>('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterModule, setFilterModule] = useState<string>('all');

  // Fetch modules
  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['app-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_modules')
        .select('id, name, display_name')
        .eq('is_enabled', true)
        .order('display_name');
      
      if (error) throw error;
      return data as AppModule[];
    },
  });

  // Fetch actions for selected module
  const { data: actions = [], isLoading: actionsLoading } = useQuery({
    queryKey: ['module-actions', selectedModuleId],
    queryFn: async () => {
      if (!selectedModuleId) return [];
      const { data, error } = await supabase
        .from('module_actions')
        .select('id, module_id, action_name, display_name, is_enabled')
        .eq('module_id', selectedModuleId)
        .eq('is_enabled', true)
        .order('display_name');
      
      if (error) throw error;
      return data as ModuleAction[];
    },
    enabled: !!selectedModuleId,
  });

  // Fetch existing bindings
  const { data: bindings = [], isLoading: bindingsLoading } = useQuery({
    queryKey: ['module-button-bindings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_button_bindings')
        .select(`
          id,
          module_id,
          action_id,
          button_key,
          button_label,
          created_at
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ButtonBinding[];
    },
  });

  // Enrich bindings with module and action info
  const enrichedBindings = useMemo(() => {
    return bindings.map(binding => ({
      ...binding,
      module: modules.find(m => m.id === binding.module_id),
      action: actions.find(a => a.id === binding.action_id) || 
        // Try to find action in all modules
        undefined,
    }));
  }, [bindings, modules, actions]);

  // Filter bindings by module
  const filteredBindings = useMemo(() => {
    if (filterModule === 'all') return enrichedBindings;
    return enrichedBindings.filter(b => b.module_id === filterModule);
  }, [enrichedBindings, filterModule]);

  // Create binding mutation
  const createBinding = useMutation({
    mutationFn: async (data: { module_id: string; action_id: string; button_key: string; button_label: string }) => {
      const { error } = await supabase
        .from('module_button_bindings')
        .insert(data);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-button-bindings'] });
      toast.success('Button binding created successfully');
      resetForm();
      setShowAddDialog(false);
    },
    onError: (error) => {
      console.error('Error creating binding:', error);
      toast.error('Failed to create button binding');
    },
  });

  // Delete binding mutation
  const deleteBinding = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('module_button_bindings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-button-bindings'] });
      toast.success('Button binding removed');
    },
    onError: (error) => {
      console.error('Error deleting binding:', error);
      toast.error('Failed to remove button binding');
    },
  });

  const resetForm = () => {
    setSelectedModuleId('');
    setSelectedActionId('');
    setSelectedButtonKey('');
    setCustomButtonLabel('');
  };

  const handleSaveBinding = () => {
    if (!selectedModuleId || !selectedActionId || !selectedButtonKey) {
      toast.error('Please select module, action, and button');
      return;
    }

    const buttonInfo = SCREEN_BUTTONS.find(b => b.key === selectedButtonKey);
    const label = customButtonLabel || buttonInfo?.label || selectedButtonKey;

    createBinding.mutate({
      module_id: selectedModuleId,
      action_id: selectedActionId,
      button_key: selectedButtonKey,
      button_label: label,
    });
  };

  const getButtonLabel = (key: string) => {
    return SCREEN_BUTTONS.find(b => b.key === key)?.label || key;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="h-6 w-6" />
            Module Action Button Bindings
          </h1>
          <p className="text-muted-foreground mt-1">
            Bind module actions to screen buttons to control visibility based on user permissions
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Binding
        </Button>
      </div>

      {/* Filter by Module */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="whitespace-nowrap">Filter by Module:</Label>
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {modules.map((module) => (
                  <SelectItem key={module.id} value={module.id}>
                    {module.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bindings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configured Bindings
          </CardTitle>
          <CardDescription>
            These bindings determine which buttons are visible based on user permissions for each module action.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bindingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredBindings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Unlink className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No button bindings configured yet.</p>
              <p className="text-sm mt-1">Click "Add Binding" to create one.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Button</TableHead>
                  <TableHead>Button Label</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBindings.map((binding) => (
                  <TableRow key={binding.id}>
                    <TableCell>
                      <Badge variant="outline">{binding.module?.display_name || 'Unknown'}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {binding.action?.display_name || binding.action_id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MousePointer className="h-4 w-4 text-muted-foreground" />
                        <code className="text-xs bg-muted px-2 py-1 rounded">{binding.button_key}</code>
                      </div>
                    </TableCell>
                    <TableCell>{binding.button_label}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBinding.mutate(binding.id)}
                        disabled={deleteBinding.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Binding Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Button Binding</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Module Selection */}
            <div className="space-y-2">
              <Label>Module <span className="text-destructive">*</span></Label>
              <Select value={selectedModuleId} onValueChange={(v) => {
                setSelectedModuleId(v);
                setSelectedActionId('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a module" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Selection */}
            <div className="space-y-2">
              <Label>Action <span className="text-destructive">*</span></Label>
              <Select 
                value={selectedActionId} 
                onValueChange={setSelectedActionId}
                disabled={!selectedModuleId || actionsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={actionsLoading ? 'Loading...' : 'Select an action'} />
                </SelectTrigger>
                <SelectContent>
                  {actions.map((action) => (
                    <SelectItem key={action.id} value={action.id}>
                      {action.display_name} ({action.action_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Button Selection */}
            <div className="space-y-2">
              <Label>Screen Button <span className="text-destructive">*</span></Label>
              <Select value={selectedButtonKey} onValueChange={(v) => {
                setSelectedButtonKey(v);
                const btn = SCREEN_BUTTONS.find(b => b.key === v);
                setCustomButtonLabel(btn?.label || '');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a button" />
                </SelectTrigger>
                <SelectContent>
                  {SCREEN_BUTTONS.map((button) => (
                    <SelectItem key={button.key} value={button.key}>
                      <div className="flex flex-col">
                        <span>{button.label}</span>
                        <span className="text-xs text-muted-foreground">{button.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Label */}
            <div className="space-y-2">
              <Label>Button Label</Label>
              <Input
                value={customButtonLabel}
                onChange={(e) => setCustomButtonLabel(e.target.value)}
                placeholder="Custom button label (optional)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              resetForm();
              setShowAddDialog(false);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveBinding}
              disabled={!selectedModuleId || !selectedActionId || !selectedButtonKey || createBinding.isPending}
            >
              {createBinding.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Binding'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ModuleButtonBindings() {
  return (
    <PermissionWrapper moduleName={MODULE_NAMES.MODULE_MANAGEMENT}>
      <ModuleButtonBindingsContent />
    </PermissionWrapper>
  );
}
