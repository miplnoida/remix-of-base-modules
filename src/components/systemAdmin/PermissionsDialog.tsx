import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { DbRole, useRolePermissions, useModulesWithActions, useSaveRolePermissions } from "@/hooks/useRolesData";

interface PermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: DbRole;
}

export function PermissionsDialog({ open, onOpenChange, role }: PermissionsDialogProps) {
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  
  const { data: existingPermissions = [], isLoading: loadingPermissions } = useRolePermissions(role.id);
  const { data: modules = [], isLoading: loadingModules } = useModulesWithActions();
  const savePermissions = useSaveRolePermissions();

  useEffect(() => {
    if (existingPermissions.length > 0) {
      const granted = new Set(existingPermissions.filter(p => p.is_granted).map(p => p.module_id));
      setSelectedModules(granted);
    } else {
      setSelectedModules(new Set());
    }
  }, [existingPermissions]);

  const handleToggle = (moduleId: string) => {
    setSelectedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedModules.size === modules.length) {
      setSelectedModules(new Set());
    } else {
      setSelectedModules(new Set(modules.map(m => m.id)));
    }
  };

  const handleSave = async () => {
    const permissions = modules.map(m => ({
      module_id: m.id,
      is_granted: selectedModules.has(m.id),
    })).filter(p => p.is_granted);

    await savePermissions.mutateAsync({ roleId: role.id, permissions });
    onOpenChange(false);
  };

  const isLoading = loadingPermissions || loadingModules;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Manage Permissions: {role.role_name}</DialogTitle>
          <DialogDescription>
            Select modules this role can access
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedModules.size === modules.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {modules.map(module => (
                  <div key={module.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={module.id}
                      checked={selectedModules.has(module.id)}
                      onCheckedChange={() => handleToggle(module.id)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={module.id} className="text-sm font-medium cursor-pointer">
                        {module.display_name}
                      </Label>
                      <p className="text-xs text-muted-foreground">{module.description || module.name}</p>
                    </div>
                  </div>
                ))}
                {modules.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No modules available.</p>
                )}
              </div>
            </ScrollArea>
          </>
        )}
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={savePermissions.isPending}>
            {savePermissions.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Permissions
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
