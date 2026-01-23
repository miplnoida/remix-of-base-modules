import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import * as LucideIcons from "lucide-react";

interface AppModule {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  route: string | null;
  parent_id: string | null;
  sort_order: number;
  is_enabled: boolean;
}

interface MenuItem {
  title: string;
  url?: string;
  icon: any;
  description?: string;
  subItems?: MenuItem[];
}

// Helper to get Lucide icon by name
const getIcon = (iconName: string | null) => {
  if (!iconName) return LucideIcons.Circle;
  const Icon = (LucideIcons as any)[iconName];
  return Icon || LucideIcons.Circle;
};

// Hook to check if current user is Admin
export function useIsAdmin() {
  const { user } = useSupabaseAuth();
  
  const { data: isAdmin = false } = useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .rpc('is_admin', { _user_id: user.id });
      if (error) throw error;
      return data ?? false;
    },
    enabled: !!user?.id,
  });

  return isAdmin;
}

export function useNavigationMenu() {
  const { user, isAuthenticated } = useSupabaseAuth();
  const isAdmin = useIsAdmin();

  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['navigation-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_modules')
        .select('*')
        .eq('is_enabled', true)
        .order('sort_order');
      if (error) throw error;
      return data as AppModule[];
    },
    enabled: isAuthenticated,
  });

  const { data: userPermissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['user-navigation-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .rpc('get_user_permissions', { _user_id: user.id });
      if (error) throw error;
      return data as Array<{ module_name: string; action_name: string; is_granted: boolean }>;
    },
    enabled: !!user?.id,
  });

  // Build navigation tree
  const buildMenuItems = (): MenuItem[] => {
    if (!modules.length) return [];

    // Admin users see all modules - skip permission filtering
    if (isAdmin) {
      const parentModules = modules
        .filter(m => !m.parent_id && m.is_enabled)
        .sort((a, b) => a.sort_order - b.sort_order);
      
      const childModulesMap = new Map<string, AppModule[]>();
      
      modules.forEach(m => {
        if (m.parent_id) {
          const children = childModulesMap.get(m.parent_id) || [];
          children.push(m);
          childModulesMap.set(m.parent_id, children.sort((a, b) => a.sort_order - b.sort_order));
        }
      });

      return parentModules.map(parent => {
        const children = childModulesMap.get(parent.id) || [];
        const menuItem: MenuItem = {
          title: parent.display_name,
          icon: getIcon(parent.icon),
          description: parent.description || undefined,
        };

        if (children.length > 0) {
          menuItem.subItems = children.map(child => ({
            title: child.display_name,
            url: child.route || undefined,
            icon: getIcon(child.icon),
            description: child.description || undefined,
          }));
        } else if (parent.route) {
          menuItem.url = parent.route;
        }

        return menuItem;
      });
    }

    // Non-admin users: filter by permissions using module_name
    const accessibleModuleNames = new Set(
      userPermissions
        .filter(p => p.action_name === 'view' && p.is_granted)
        .map(p => p.module_name)
    );
    
    const parentModules = modules
      .filter(m => !m.parent_id && m.is_enabled)
      .sort((a, b) => a.sort_order - b.sort_order);
    
    const childModulesMap = new Map<string, AppModule[]>();
    
    modules.forEach(m => {
      if (m.parent_id) {
        const children = childModulesMap.get(m.parent_id) || [];
        children.push(m);
        childModulesMap.set(m.parent_id, children.sort((a, b) => a.sort_order - b.sort_order));
      }
    });

    const menuItems: MenuItem[] = [];

    parentModules.forEach(parent => {
      const children = childModulesMap.get(parent.id) || [];
      
      const accessibleChildren = children.filter(child => 
        userPermissions.length === 0 || accessibleModuleNames.has(child.name)
      );

      const parentAccessible = userPermissions.length === 0 || accessibleModuleNames.has(parent.name);
      
      if (accessibleChildren.length > 0 || parentAccessible) {
        const menuItem: MenuItem = {
          title: parent.display_name,
          icon: getIcon(parent.icon),
          description: parent.description || undefined,
        };

        if (accessibleChildren.length > 0) {
          menuItem.subItems = accessibleChildren.map(child => ({
            title: child.display_name,
            url: child.route || undefined,
            icon: getIcon(child.icon),
            description: child.description || undefined,
          }));
        } else if (parent.route) {
          menuItem.url = parent.route;
        }

        menuItems.push(menuItem);
      }
    });

    return menuItems;
  };

  return {
    menuItems: buildMenuItems(),
    isLoading: modulesLoading || permissionsLoading,
    userPermissions,
    isAdmin,
  };
}

// Hook to check if user has specific permission
export function useHasPermission(moduleName: string, actionName: string): boolean {
  const { user } = useSupabaseAuth();
  const isAdmin = useIsAdmin();
  
  const { data: hasPermission = false } = useQuery({
    queryKey: ['has-permission', user?.id, moduleName, actionName],
    queryFn: async () => {
      if (!user?.id) return false;
      // Admin always has permission - handled by RPC but we can short-circuit here
      const { data, error } = await supabase
        .rpc('has_permission', {
          _user_id: user.id,
          _module_name: moduleName,
          _action_name: actionName
        });
      if (error) throw error;
      return data ?? false;
    },
    enabled: !!user?.id && !!moduleName && !!actionName,
  });

  // Admin role bypass - always return true
  if (isAdmin) return true;
  
  return hasPermission;
}

// Hook to get all user permissions for a module
export function useModulePermissions(moduleName: string) {
  const { user } = useSupabaseAuth();
  const isAdmin = useIsAdmin();
  
  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['module-permissions', user?.id, moduleName],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .rpc('get_user_permissions', { _user_id: user.id });
      if (error) throw error;
      return (data as Array<{ module_name: string; action_name: string }>)
        .filter(p => p.module_name === moduleName)
        .map(p => p.action_name);
    },
    enabled: !!user?.id && !!moduleName,
  });

  return {
    permissions,
    isLoading,
    isAdmin,
    // Admin always has all permissions
    hasPermission: (action: string) => isAdmin || permissions.includes(action),
  };
}
