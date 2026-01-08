import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAppModules, AppRole } from "@/hooks/useAdminData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const AVAILABLE_ROLES: AppRole[] = ['Admin', 'Clerk', 'FinanceOfficer', 'LegalOfficer', 'Supervisor', 'ReadOnly'];

interface RolePermission {
  id: string;
  role: AppRole;
  module_id: string;
  action_id: string;
  is_granted: boolean;
}

const RolePermissionManagement = () => {
  const [selectedRole, setSelectedRole] = useState<AppRole>('Admin');
  const queryClient = useQueryClient();
  
  const { data: modules = [], isLoading: modulesLoading } = useAppModules();
  
  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['role-permissions', selectedRole],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', selectedRole);
      if (error) throw error;
      return data as RolePermission[];
    },
  });

  const updatePermission = useMutation({
    mutationFn: async ({ moduleId, actionId, isGranted }: { moduleId: string; actionId: string; isGranted: boolean }) => {
      // Check if permission exists
      const existing = permissions.find(p => p.module_id === moduleId && p.action_id === actionId);
      
      if (existing) {
        if (isGranted) {
          // Update existing
          const { error } = await supabase
            .from('role_permissions')
            .update({ is_granted: isGranted })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          // Delete if revoking
          const { error } = await supabase
            .from('role_permissions')
            .delete()
            .eq('id', existing.id);
          if (error) throw error;
        }
      } else if (isGranted) {
        // Create new
        const { error } = await supabase
          .from('role_permissions')
          .insert({ role: selectedRole, module_id: moduleId, action_id: actionId, is_granted: isGranted });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', selectedRole] });
      toast.success('Permission updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const isPermissionGranted = (moduleId: string, actionId: string) => {
    return permissions.some(p => p.module_id === moduleId && p.action_id === actionId && p.is_granted);
  };

  const handlePermissionToggle = (moduleId: string, actionId: string) => {
    if (isAdminRole) return; // Prevent toggling Admin permissions
    const currentlyGranted = isPermissionGranted(moduleId, actionId);
    updatePermission.mutate({ moduleId, actionId, isGranted: !currentlyGranted });
  };

  const isAdminRole = selectedRole === 'Admin';
  const enabledModules = modules.filter(m => m.is_enabled);

  if (modulesLoading || permissionsLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Role Permission Management</h1>
          <p className="text-muted-foreground mt-1">Assign module actions to roles</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Configure Permissions
          </CardTitle>
          <CardDescription>Select a role and configure which module actions it can access</CardDescription>
          <div className="mt-4">
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_ROLES.map(role => (
                  <SelectItem key={role} value={role}>{role.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isAdminRole && (
            <Alert className="mb-6 border-primary/50 bg-primary/5">
              <Lock className="h-4 w-4" />
              <AlertTitle>Admin Role Permissions</AlertTitle>
              <AlertDescription>
                The Admin role has full access to all modules and actions. These permissions are protected and cannot be modified.
              </AlertDescription>
            </Alert>
          )}
          {enabledModules.length === 0 ? (
            <p className="text-muted-foreground">No modules available. Create modules first.</p>
          ) : (
            <div className="space-y-6">
              {enabledModules.map(module => (
                <div key={module.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3">{module.display_name}</h3>
                  {module.actions && module.actions.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {module.actions.filter(a => a.is_enabled).map(action => (
                        <div key={action.id} className="flex items-center gap-2">
                          <Checkbox 
                            id={`${module.id}-${action.id}`}
                            checked={isAdminRole || isPermissionGranted(module.id, action.id)}
                            onCheckedChange={() => handlePermissionToggle(module.id, action.id)}
                            disabled={updatePermission.isPending || isAdminRole}
                          />
                          <label 
                            htmlFor={`${module.id}-${action.id}`} 
                            className={`text-sm ${isAdminRole ? 'text-muted-foreground' : 'cursor-pointer'}`}
                          >
                            {action.display_name}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No actions defined for this module</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RolePermissionManagement;
