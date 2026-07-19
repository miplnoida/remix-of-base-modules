import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import * as LucideIcons from "lucide-react";
import { resolveComplianceAccess, type ComplianceModuleRow } from "@/lib/compliance/accessResolution";
import { fetchAllUserPermissions } from "@/lib/permissions/fetchAllUserPermissions";

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
  const { user, isAuthenticated, isAuthReady } = useSupabaseAuth();
  const isAdmin = useIsAdmin();

  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['navigation-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_modules')
        .select('*')
        .eq('is_enabled', true)
        .eq('show_in_menu', true)
        .order('sort_order');
      if (error) throw error;
      return data as AppModule[];
    },
    enabled: isAuthReady && isAuthenticated,
  });

  const { data: userPermissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['user-navigation-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await fetchAllUserPermissions(user.id);
    },
    enabled: isAuthReady && isAuthenticated && !!user?.id,
  });


  // Build navigation tree (recursive — supports unlimited nesting)
  const buildMenuItems = (): MenuItem[] => {
    if (!modules.length) return [];

    // Index children by parent_id, sorted
    const childrenByParent = new Map<string, AppModule[]>();
    modules.forEach(m => {
      const key = m.parent_id || '__root__';
      const arr = childrenByParent.get(key) || [];
      arr.push(m);
      childrenByParent.set(key, arr);
    });
    childrenByParent.forEach(arr => arr.sort((a, b) => a.sort_order - b.sort_order));

    // Admin sees everything; non-admin filters by permission name
    const accessibleModuleNames = new Set(
      userPermissions
        .filter(p => p.action_name === 'view' && p.is_granted)
        .map(p => p.module_name)
    );
    // BN-GAP-MENU Part H — fail CLOSED. Previously non-admins with zero
    // permissions could see every enabled module (skipPermFilter=true when
    // userPermissions.length === 0). Now only Admin bypasses filtering; every
    // other user must have an explicit `view` grant for the module.
    const isAccessible = (m: AppModule) =>
      isAdmin || accessibleModuleNames.has(m.name);

    const buildNode = (m: AppModule): MenuItem | null => {
      if (!m.is_enabled) return null;

      const rawChildren = childrenByParent.get(m.id) || [];
      const childNodes = rawChildren
        .map(buildNode)
        .filter((c): c is MenuItem => c !== null);

      // Keep node if user can access it OR if any descendant is accessible
      if (!isAccessible(m) && childNodes.length === 0) return null;

      const node: MenuItem = {
        title: m.display_name,
        icon: getIcon(m.icon),
        description: m.description || undefined,
      };

      if (childNodes.length > 0) {
        node.subItems = childNodes;
      } else if (m.route) {
        node.url = m.route;
      }

      return node;
    };

    const roots = childrenByParent.get('__root__') || [];
    return roots
      .map(buildNode)
      .filter((n): n is MenuItem => n !== null);
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
  const { user, isAuthReady, isAuthenticated } = useSupabaseAuth();
  const isAdmin = useIsAdmin();
  const { pathname } = useLocation();
  const useRouteModule = moduleName === 'manage_compliance' && pathname.startsWith('/compliance');
  
  const { data: hasPermission = false } = useQuery({
    queryKey: ['has-permission', user?.id, moduleName, actionName, useRouteModule ? pathname : 'static'],
    queryFn: async () => {
      if (!user?.id) return false;
      if (useRouteModule) {
        const [modulesResult, permissions] = await Promise.all([
          supabase
            .from('app_modules')
            .select('id,name,display_name,route,parent_id,sort_order,is_enabled,show_in_menu,routes_enabled')
            .or('route.like./compliance/%,route.eq./compliance')
            .eq('is_enabled', true),
          fetchAllUserPermissions(user.id),
        ]);
        if (modulesResult.error) throw modulesResult.error;
        const resolution = resolveComplianceAccess({
          pathname,
          modules: (modulesResult.data || []) as ComplianceModuleRow[],
          permissions,
          isAdmin,
        });
        const effectiveNames = resolution.selectedCandidates.map((candidate) => candidate.module.name);
        return permissions.some((p) => effectiveNames.includes(p.module_name) && p.action_name === actionName && p.is_granted !== false);
      }

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
    enabled: isAuthReady && isAuthenticated && !!user?.id && !!moduleName && !!actionName,
  });

  // Admin role bypass - always return true
  if (isAdmin) return true;
  
  return hasPermission;
}

// Hook to get all user permissions for a module
export function useModulePermissions(moduleName: string) {
  const { user, isAuthReady, isAuthenticated } = useSupabaseAuth();
  const isAdmin = useIsAdmin();
  
  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['module-permissions', user?.id, moduleName],
    queryFn: async () => {
      if (!user?.id) return [];
      const all = await fetchAllUserPermissions(user.id);
      return all
        .filter((p) => p.module_name === moduleName)
        .map((p) => p.action_name);
    },
    enabled: isAuthReady && isAuthenticated && !!user?.id && !!moduleName,
  });

  return {
    permissions,
    isLoading,
    isAdmin,
    // Admin always has all permissions
    hasPermission: (action: string) => isAdmin || permissions.includes(action),
  };
}
