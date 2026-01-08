import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Shield, AlertTriangle, Lock } from "lucide-react";
import { useUserProfile, useAssignRole, useRemoveRole, AppRole } from "@/hooks/useAdminData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const AVAILABLE_ROLES: AppRole[] = ['Admin', 'Clerk', 'FinanceOfficer', 'LegalOfficer', 'Supervisor', 'ReadOnly'];

interface UserPermissionOverride {
  id: string;
  user_id: string;
  module_id: string;
  action_id: string;
  is_granted: boolean;
  module?: { name: string; display_name: string };
  action?: { action_name: string; display_name: string };
}

const UserRoles = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useUserProfile(userId || '');
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();

  // Get user's current roles
  const { data: userRoles = [] } = useQuery({
    queryKey: ['user-roles', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId!);
      if (error) throw error;
      return data.map(r => r.role as AppRole);
    },
    enabled: !!userId,
  });

  // Get user permission overrides
  const { data: permissionOverrides = [] } = useQuery({
    queryKey: ['user-permission-overrides', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_permission_overrides')
        .select(`
          *,
          module:app_modules(name, display_name),
          action:module_actions(action_name, display_name)
        `)
        .eq('user_id', userId!);
      if (error) throw error;
      return data as UserPermissionOverride[];
    },
    enabled: !!userId,
  });

  // Get all enabled modules and actions for override management
  const { data: modules = [] } = useQuery({
    queryKey: ['app-modules-with-actions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_modules')
        .select('*, module_actions(*)')
        .eq('is_enabled', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Add/remove permission override
  const overrideMutation = useMutation({
    mutationFn: async ({ moduleId, actionId, isGranted, remove }: { moduleId: string; actionId: string; isGranted?: boolean; remove?: boolean }) => {
      if (remove) {
        const { error } = await supabase
          .from('user_permission_overrides')
          .delete()
          .eq('user_id', userId!)
          .eq('module_id', moduleId)
          .eq('action_id', actionId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_permission_overrides')
          .upsert({
            user_id: userId!,
            module_id: moduleId,
            action_id: actionId,
            is_granted: isGranted,
          }, { onConflict: 'user_id,module_id,action_id' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permission-overrides', userId] });
      toast.success('Permission override updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleRoleToggle = async (role: AppRole, isAssigned: boolean) => {
    if (isAssigned) {
      await removeRole.mutateAsync({ userId: userId!, role });
    } else {
      await assignRole.mutateAsync({ userId: userId!, role });
    }
  };

  const getOverrideStatus = (moduleId: string, actionId: string) => {
    const override = permissionOverrides.find(o => o.module_id === moduleId && o.action_id === actionId);
    return override ? (override.is_granted ? 'granted' : 'revoked') : null;
  };

  // Check if user has Admin role - Admin users don't need permission overrides
  const hasAdminRole = userRoles.includes('Admin');

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading user...</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center h-64">User not found</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/users/${userId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manage Roles & Permissions</h1>
          <p className="text-muted-foreground mt-1">{user.full_name} ({user.email})</p>
        </div>
      </div>

      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="overrides" disabled={hasAdminRole}>
            Permission Overrides {hasAdminRole && '(N/A for Admin)'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Assigned Roles
              </CardTitle>
              <CardDescription>
                Select roles to assign to this user. Role permissions are inherited automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasAdminRole && (
                <Alert className="mb-6 border-primary/50 bg-primary/5">
                  <Lock className="h-4 w-4" />
                  <AlertTitle>Admin Role Active</AlertTitle>
                  <AlertDescription>
                    This user has the Admin role and automatically has full access to all modules, actions, and features. 
                    No additional permissions or overrides are required.
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AVAILABLE_ROLES.map(role => {
                  const isAssigned = userRoles.includes(role);
                  return (
                    <div key={role} className={`flex items-center justify-between p-4 border rounded-lg ${role === 'Admin' && isAssigned ? 'border-primary/50 bg-primary/5' : ''}`}>
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={isAssigned}
                          onCheckedChange={() => handleRoleToggle(role, isAssigned)}
                          disabled={assignRole.isPending || removeRole.isPending}
                        />
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            {role.replace(/([A-Z])/g, ' $1').trim()}
                            {role === 'Admin' && <Badge variant="secondary" className="text-xs">Full Access</Badge>}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {role === 'Admin' && 'Full system access - all modules and actions'}
                            {role === 'Clerk' && 'Data entry and basic operations'}
                            {role === 'FinanceOfficer' && 'Financial operations'}
                            {role === 'LegalOfficer' && 'Legal case management'}
                            {role === 'Supervisor' && 'Team supervision and approvals'}
                            {role === 'ReadOnly' && 'View-only access'}
                          </p>
                        </div>
                      </div>
                      {isAssigned && <Badge>Assigned</Badge>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overrides">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Permission Overrides
              </CardTitle>
              <CardDescription>
                Override specific permissions for this user. Overrides take precedence over role permissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {permissionOverrides.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium mb-3">Active Overrides</h4>
                  <div className="space-y-2">
                    {permissionOverrides.map(override => (
                      <div key={override.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <span className="font-medium">{override.module?.display_name}</span>
                          <span className="text-muted-foreground"> → </span>
                          <span>{override.action?.display_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={override.is_granted ? "default" : "destructive"}>
                            {override.is_granted ? "Granted" : "Revoked"}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => overrideMutation.mutate({ 
                              moduleId: override.module_id, 
                              actionId: override.action_id, 
                              remove: true 
                            })}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-6" />
                </div>
              )}

              <div className="space-y-6">
                {modules.map(module => (
                  <div key={module.id} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">{module.display_name}</h4>
                    {module.module_actions && module.module_actions.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {module.module_actions.filter((a: any) => a.is_enabled).map((action: any) => {
                          const overrideStatus = getOverrideStatus(module.id, action.id);
                          return (
                            <div key={action.id} className="flex flex-col gap-1 p-2 bg-muted/50 rounded">
                              <span className="text-sm font-medium">{action.display_name}</span>
                              <div className="flex gap-1">
                                <Button
                                  variant={overrideStatus === 'granted' ? "default" : "outline"}
                                  size="sm"
                                  className="flex-1 text-xs"
                                  onClick={() => overrideMutation.mutate({ 
                                    moduleId: module.id, 
                                    actionId: action.id, 
                                    isGranted: true 
                                  })}
                                >
                                  Grant
                                </Button>
                                <Button
                                  variant={overrideStatus === 'revoked' ? "destructive" : "outline"}
                                  size="sm"
                                  className="flex-1 text-xs"
                                  onClick={() => overrideMutation.mutate({ 
                                    moduleId: module.id, 
                                    actionId: action.id, 
                                    isGranted: false 
                                  })}
                                >
                                  Revoke
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No actions defined</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserRoles;
