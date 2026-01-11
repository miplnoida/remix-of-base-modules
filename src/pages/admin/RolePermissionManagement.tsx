import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Search, ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useAppModules, AppRole } from "@/hooks/useAdminData";
import { useDbRoles } from "@/hooks/useRolesData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";
import type { AppModule } from "@/hooks/useAdminData";

interface RolePermission {
  id: string;
  role: AppRole;
  module_id: string;
  action_id: string;
  is_granted: boolean;
}

// Helper to get Lucide icon by name
const getIcon = (iconName: string | null) => {
  if (!iconName) return LucideIcons.Circle;
  const Icon = (LucideIcons as any)[iconName];
  return Icon || LucideIcons.Circle;
};

interface ModuleTreeItemProps {
  module: AppModule;
  children: AppModule[];
  level: number;
  expandedModules: Set<string>;
  toggleExpand: (id: string) => void;
  isAdminRole: boolean;
  permissions: RolePermission[];
  isPermissionGranted: (moduleId: string, actionId: string) => boolean;
  handlePermissionToggle: (moduleId: string, actionId: string) => void;
  isPending: boolean;
}

const ModuleTreeItem = ({
  module,
  children,
  level,
  expandedModules,
  toggleExpand,
  isAdminRole,
  permissions,
  isPermissionGranted,
  handlePermissionToggle,
  isPending,
}: ModuleTreeItemProps) => {
  const hasChildren = children.length > 0;
  const isExpanded = expandedModules.has(module.id);
  const Icon = getIcon(module.icon);
  const enabledActions = module.actions?.filter(a => a.is_enabled) || [];
  const grantedCount = enabledActions.filter(a => isAdminRole || isPermissionGranted(module.id, a.id)).length;

  return (
    <div className="border-b last:border-b-0">
      <div
        className={cn(
          "flex items-center gap-3 py-3 px-4 hover:bg-muted/50 transition-colors cursor-pointer",
        )}
        style={{ paddingLeft: level * 24 + 16 }}
        onClick={() => toggleExpand(module.id)}
      >
        {hasChildren || enabledActions.length > 0 ? (
          <button
            className="p-1 hover:bg-muted rounded"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(module.id);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <div className="w-6" />
        )}
        
        <Icon className="h-5 w-5 text-primary flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{module.display_name}</span>
            <span className="text-xs text-muted-foreground">({module.name})</span>
          </div>
          {module.description && (
            <p className="text-xs text-muted-foreground truncate">{module.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {enabledActions.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {grantedCount}/{enabledActions.length} Actions
            </Badge>
          )}
          {!module.is_enabled && (
            <Badge variant="secondary" className="text-xs">Disabled</Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      {isExpanded && enabledActions.length > 0 && (
        <div 
          className="bg-muted/30 border-t py-3 px-4"
          style={{ paddingLeft: (level + 1) * 24 + 40 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {enabledActions.map(action => (
              <div key={action.id} className="flex items-center gap-2">
                <Checkbox 
                  id={`${module.id}-${action.id}`}
                  checked={isAdminRole || isPermissionGranted(module.id, action.id)}
                  onCheckedChange={() => handlePermissionToggle(module.id, action.id)}
                  disabled={isPending || isAdminRole}
                />
                <label 
                  htmlFor={`${module.id}-${action.id}`} 
                  className={cn(
                    "text-sm",
                    isAdminRole ? 'text-muted-foreground' : 'cursor-pointer hover:text-foreground'
                  )}
                >
                  {action.display_name}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {children.map((child) => (
            <ModuleTreeItem
              key={child.id}
              module={child}
              children={[]}
              level={level + 1}
              expandedModules={expandedModules}
              toggleExpand={toggleExpand}
              isAdminRole={isAdminRole}
              permissions={permissions}
              isPermissionGranted={isPermissionGranted}
              handlePermissionToggle={handlePermissionToggle}
              isPending={isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const RolePermissionManagement = () => {
  const [selectedRoleName, setSelectedRoleName] = useState<string>('Admin');
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  
  const { data: dbRoles = [], isLoading: rolesLoading } = useDbRoles();
  const { data: modules = [], isLoading: modulesLoading } = useAppModules();

  // Set initial role once roles are loaded
  useEffect(() => {
    if (dbRoles.length > 0 && !selectedRoleName) {
      const adminRole = dbRoles.find(r => r.role_name === 'Admin');
      if (adminRole) {
        setSelectedRoleName(adminRole.role_name);
      } else {
        setSelectedRoleName(dbRoles[0].role_name);
      }
    }
  }, [dbRoles, selectedRoleName]);
  
  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['role-permissions', selectedRoleName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', selectedRoleName as AppRole);
      if (error) throw error;
      return data as RolePermission[];
    },
    enabled: !!selectedRoleName,
  });

  // Build tree structure
  const { parentModules, childModulesMap, filteredParentModules } = useMemo(() => {
    const enabledModules = modules.filter(m => m.is_enabled);
    const parents = enabledModules
      .filter((m) => !m.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order);
    
    const childMap = new Map<string, AppModule[]>();
    enabledModules.forEach((m) => {
      if (m.parent_id) {
        const children = childMap.get(m.parent_id) || [];
        children.push(m);
        childMap.set(m.parent_id, children.sort((a, b) => a.sort_order - b.sort_order));
      }
    });

    const filtered = parents.filter((module) =>
      module.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (childMap.get(module.id) || []).some(
        (child) =>
          child.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          child.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );

    return {
      parentModules: parents,
      childModulesMap: childMap,
      filteredParentModules: filtered,
    };
  }, [modules, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedModules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

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
          .insert({ role: selectedRoleName as AppRole, module_id: moduleId, action_id: actionId, is_granted: isGranted });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', selectedRoleName] });
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

  const isAdminRole = selectedRoleName === 'Admin';

  if (modulesLoading || permissionsLoading || rolesLoading) {
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
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <Select value={selectedRoleName} onValueChange={setSelectedRoleName}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {dbRoles.filter(r => r.is_active).map(role => (
                  <SelectItem key={role.id} value={role.role_name}>
                    {role.role_name.replace(/([A-Z])/g, ' $1').trim()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (expandedModules.size > 0) {
                  setExpandedModules(new Set());
                } else {
                  setExpandedModules(new Set(parentModules.map((m) => m.id)));
                }
              }}
            >
              {expandedModules.size > 0 ? "Collapse All" : "Expand All"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isAdminRole && (
            <Alert className="mx-6 mb-4 border-primary/50 bg-primary/5">
              <Lock className="h-4 w-4" />
              <AlertTitle>Admin Role Permissions</AlertTitle>
              <AlertDescription>
                The Admin role has full access to all modules and actions. These permissions are protected and cannot be modified.
              </AlertDescription>
            </Alert>
          )}
          {filteredParentModules.length === 0 ? (
            <p className="text-muted-foreground p-6">No modules available. Create modules first.</p>
          ) : (
            <div className="divide-y">
              {filteredParentModules.map((module) => (
                <ModuleTreeItem
                  key={module.id}
                  module={module}
                  children={childModulesMap.get(module.id) || []}
                  level={0}
                  expandedModules={expandedModules}
                  toggleExpand={toggleExpand}
                  isAdminRole={isAdminRole}
                  permissions={permissions}
                  isPermissionGranted={isPermissionGranted}
                  handlePermissionToggle={handlePermissionToggle}
                  isPending={updatePermission.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RolePermissionManagement;
