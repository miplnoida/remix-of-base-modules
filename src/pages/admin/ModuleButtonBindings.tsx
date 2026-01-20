import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Link2, Unlink, Loader2, Settings2, MousePointer, RefreshCw, XCircle } from 'lucide-react';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { MODULE_NAMES } from '@/hooks/useActionPermission';

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
}

interface ActionBindingState {
  action_id: string;
  action_name: string;
  display_name: string;
  button_key: string;
  existing_binding_id: string | null;
  hasChanged: boolean;
}

// Predefined screen buttons that can be bound
const SCREEN_BUTTONS = [
  { key: '', label: '-- No Binding --', description: 'Remove binding' },
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
  const [actionBindings, setActionBindings] = useState<ActionBindingState[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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

  // Fetch existing bindings for selected module
  const { data: existingBindings = [], isLoading: bindingsLoading, refetch: refetchBindings } = useQuery({
    queryKey: ['module-button-bindings', selectedModuleId],
    queryFn: async () => {
      if (!selectedModuleId) return [];
      const { data, error } = await supabase
        .from('module_button_bindings')
        .select('*')
        .eq('module_id', selectedModuleId);
      
      if (error) throw error;
      return data as ButtonBinding[];
    },
    enabled: !!selectedModuleId,
  });

  // Initialize action bindings when actions or existing bindings change
  useEffect(() => {
    if (actions.length > 0) {
      const initialBindings: ActionBindingState[] = actions.map(action => {
        const existingBinding = existingBindings.find(b => b.action_id === action.id);
        return {
          action_id: action.id,
          action_name: action.action_name,
          display_name: action.display_name,
          button_key: existingBinding?.button_key || '',
          existing_binding_id: existingBinding?.id || null,
          hasChanged: false,
        };
      });
      setActionBindings(initialBindings);
    } else {
      setActionBindings([]);
    }
  }, [actions, existingBindings]);

  // Handle button selection change for an action
  const handleButtonChange = useCallback((actionId: string, buttonKey: string) => {
    setActionBindings(prev => prev.map(binding => {
      if (binding.action_id === actionId) {
        const existingBinding = existingBindings.find(b => b.action_id === actionId);
        const originalButtonKey = existingBinding?.button_key || '';
        return {
          ...binding,
          button_key: buttonKey,
          hasChanged: buttonKey !== originalButtonKey,
        };
      }
      return binding;
    }));
  }, [existingBindings]);

  // Check if there are any changes
  const hasChanges = useMemo(() => {
    return actionBindings.some(b => b.hasChanged);
  }, [actionBindings]);

  // Get pending changes count
  const changesCount = useMemo(() => {
    return actionBindings.filter(b => b.hasChanged).length;
  }, [actionBindings]);

  // Save all bindings
  const handleSaveAll = async () => {
    if (!selectedModuleId) return;

    setIsSaving(true);
    try {
      const changedBindings = actionBindings.filter(b => b.hasChanged);

      for (const binding of changedBindings) {
        if (binding.existing_binding_id && !binding.button_key) {
          // Delete existing binding if button is cleared
          const { error } = await supabase
            .from('module_button_bindings')
            .delete()
            .eq('id', binding.existing_binding_id);
          
          if (error) throw error;
        } else if (binding.existing_binding_id && binding.button_key) {
          // Update existing binding
          const buttonInfo = SCREEN_BUTTONS.find(b => b.key === binding.button_key);
          const { error } = await supabase
            .from('module_button_bindings')
            .update({
              button_key: binding.button_key,
              button_label: buttonInfo?.label || binding.button_key,
            })
            .eq('id', binding.existing_binding_id);
          
          if (error) throw error;
        } else if (!binding.existing_binding_id && binding.button_key) {
          // Create new binding
          const buttonInfo = SCREEN_BUTTONS.find(b => b.key === binding.button_key);
          const { error } = await supabase
            .from('module_button_bindings')
            .insert({
              module_id: selectedModuleId,
              action_id: binding.action_id,
              button_key: binding.button_key,
              button_label: buttonInfo?.label || binding.button_key,
            });
          
          if (error) throw error;
        }
      }

      await refetchBindings();
      queryClient.invalidateQueries({ queryKey: ['module-button-bindings'] });
      toast.success(`${changesCount} binding(s) saved successfully`);
    } catch (error) {
      console.error('Error saving bindings:', error);
      toast.error('Failed to save bindings');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset changes
  const handleReset = useCallback(() => {
    const resetBindings: ActionBindingState[] = actions.map(action => {
      const existingBinding = existingBindings.find(b => b.action_id === action.id);
      return {
        action_id: action.id,
        action_name: action.action_name,
        display_name: action.display_name,
        button_key: existingBinding?.button_key || '',
        existing_binding_id: existingBinding?.id || null,
        hasChanged: false,
      };
    });
    setActionBindings(resetBindings);
  }, [actions, existingBindings]);

  const getButtonLabel = (key: string) => {
    if (!key) return '-- No Binding --';
    return SCREEN_BUTTONS.find(b => b.key === key)?.label || key;
  };

  const selectedModule = modules.find(m => m.id === selectedModuleId);
  const isLoading = actionsLoading || bindingsLoading;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Link2 className="h-6 w-6" />
          Module Action Button Bindings
        </h1>
        <p className="text-muted-foreground mt-1">
          Bind module actions to screen buttons to control visibility based on user permissions
        </p>
      </div>

      {/* Module Selection */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="whitespace-nowrap font-medium">Select Module:</Label>
            <Select 
              value={selectedModuleId} 
              onValueChange={(v) => {
                setSelectedModuleId(v);
                setActionBindings([]);
              }}
              disabled={modulesLoading}
            >
              <SelectTrigger className="w-80">
                <SelectValue placeholder={modulesLoading ? 'Loading modules...' : 'Select a module to configure'} />
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
        </CardContent>
      </Card>

      {/* Actions and Bindings */}
      {selectedModuleId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Action Bindings for: {selectedModule?.display_name}
              </CardTitle>
              <CardDescription>
                Configure which screen buttons are controlled by each action's permission.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  {changesCount} unsaved change{changesCount > 1 ? 's' : ''}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={!hasChanges || isSaving}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAll}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save All
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading actions...</span>
              </div>
            ) : actionBindings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Unlink className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No actions defined for this module.</p>
                <p className="text-sm mt-1">Add actions in Module Management first.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Action</TableHead>
                    <TableHead className="w-[150px]">Action Name</TableHead>
                    <TableHead>Screen Button</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actionBindings.map((binding) => (
                    <TableRow key={binding.action_id} className={binding.hasChanged ? 'bg-amber-50/50' : ''}>
                      <TableCell className="font-medium">
                        {binding.display_name}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {binding.action_name}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={binding.button_key}
                          onValueChange={(v) => handleButtonChange(binding.action_id, v)}
                        >
                          <SelectTrigger className="w-[250px]">
                            <div className="flex items-center gap-2">
                              {binding.button_key ? (
                                <>
                                  <MousePointer className="h-4 w-4 text-muted-foreground" />
                                  <span>{getButtonLabel(binding.button_key)}</span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">-- No Binding --</span>
                              )}
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {SCREEN_BUTTONS.map((button) => (
                              <SelectItem key={button.key || 'none'} value={button.key}>
                                <div className="flex flex-col">
                                  <span>{button.label}</span>
                                  {button.description && button.key && (
                                    <span className="text-xs text-muted-foreground">{button.description}</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {binding.hasChanged ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            Modified
                          </Badge>
                        ) : binding.button_key ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Bound
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Unbound
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedModuleId && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a Module</p>
              <p className="text-sm mt-1">Choose a module from the dropdown above to configure its action-button bindings.</p>
            </div>
          </CardContent>
        </Card>
      )}
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
