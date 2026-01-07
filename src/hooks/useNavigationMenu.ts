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

export function useNavigationMenu() {
  const { user } = useSupabaseAuth();

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
    enabled: !!user,
  });

  const { data: userPermissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['user-navigation-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .rpc('get_user_permissions', { _user_id: user.id });
      if (error) throw error;
      return data as Array<{ module_id: string; module_name: string; action_name: string }>;
    },
    enabled: !!user?.id,
  });

  // Build navigation tree
  const buildMenuItems = (): MenuItem[] => {
    if (!modules.length) return [];

    // Get modules user has access to
    const accessibleModuleIds = new Set(userPermissions.map(p => p.module_id));
    
    // Get parent modules and their children
    const parentModules = modules.filter(m => !m.parent_id && m.is_enabled);
    const childModulesMap = new Map<string, AppModule[]>();
    
    modules.forEach(m => {
      if (m.parent_id) {
        const children = childModulesMap.get(m.parent_id) || [];
        children.push(m);
        childModulesMap.set(m.parent_id, children);
      }
    });

    const menuItems: MenuItem[] = [];

    parentModules.forEach(parent => {
      const children = childModulesMap.get(parent.id) || [];
      
      // Filter children by user access
      const accessibleChildren = children.filter(child => 
        accessibleModuleIds.has(child.id) || userPermissions.length === 0
      );

      // Only show parent if it has accessible children or is directly accessible
      if (accessibleChildren.length > 0 || accessibleModuleIds.has(parent.id) || userPermissions.length === 0) {
        const menuItem: MenuItem = {
          title: parent.display_name,
          icon: getIcon(parent.icon),
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
  };
}
