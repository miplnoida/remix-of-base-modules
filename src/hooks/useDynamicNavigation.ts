import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { 
  LayoutDashboard, Users, Settings, Shield, Building2, FileText,
  ClipboardList, Bell, Key, UserCog, Briefcase, FolderTree,
  Database, Lock, Activity, Calendar, ChartBar, Home, Layers,
  Settings2, Boxes, PenTool, Mail, Building, CheckCircle, FileCheck,
  AlertTriangle, DollarSign, CreditCard, Receipt, Wallet, TrendingUp,
  PieChart, BarChart2, UserPlus, UserCheck, FilePlus, Search,
  type LucideIcon
} from 'lucide-react';

export interface MenuItem {
  id: string;
  title: string;
  url?: string;
  icon: LucideIcon;
  description?: string;
  subItems?: MenuItem[];
}

interface ModuleRow {
  id: string;
  name: string;
  display_name: string;
  icon: string | null;
  route: string | null;
  parent_id: string | null;
  sort_order: number | null;
  description: string | null;
}

// Map of icon names to Lucide icons
const iconMap: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  'layoutdashboard': LayoutDashboard,
  'dashboard': LayoutDashboard,
  'users': Users,
  'settings': Settings,
  'settings2': Settings2,
  'shield': Shield,
  'building': Building,
  'building2': Building2,
  'file-text': FileText,
  'filetext': FileText,
  'clipboard-list': ClipboardList,
  'clipboardlist': ClipboardList,
  'bell': Bell,
  'key': Key,
  'user-cog': UserCog,
  'usercog': UserCog,
  'briefcase': Briefcase,
  'folder-tree': FolderTree,
  'foldertree': FolderTree,
  'database': Database,
  'lock': Lock,
  'activity': Activity,
  'calendar': Calendar,
  'chart-bar': ChartBar,
  'chartbar': ChartBar,
  'home': Home,
  'layers': Layers,
  'boxes': Boxes,
  'pentool': PenTool,
  'pen-tool': PenTool,
  'mail': Mail,
  'checkcircle': CheckCircle,
  'check-circle': CheckCircle,
  'filecheck': FileCheck,
  'file-check': FileCheck,
  'alerttriangle': AlertTriangle,
  'alert-triangle': AlertTriangle,
  'dollarsign': DollarSign,
  'dollar-sign': DollarSign,
  'creditcard': CreditCard,
  'credit-card': CreditCard,
  'receipt': Receipt,
  'wallet': Wallet,
  'trendingup': TrendingUp,
  'trending-up': TrendingUp,
  'piechart': PieChart,
  'pie-chart': PieChart,
  'barchart2': BarChart2,
  'bar-chart-2': BarChart2,
  'userplus': UserPlus,
  'user-plus': UserPlus,
  'usercheck': UserCheck,
  'user-check': UserCheck,
  'fileplus': FilePlus,
  'file-plus': FilePlus,
  'search': Search,
};

// Map icon name string to Lucide icon component
function getIcon(iconName: string | null): LucideIcon {
  if (!iconName) return LayoutDashboard;
  
  const normalizedName = iconName.toLowerCase().replace(/[_\s]/g, '-');
  return iconMap[normalizedName] || iconMap[normalizedName.replace(/-/g, '')] || LayoutDashboard;
}

// Build hierarchical menu from flat module list
function buildMenuTree(modules: ModuleRow[]): MenuItem[] {
  const moduleMap = new Map<string, ModuleRow>();
  const childrenMap = new Map<string, ModuleRow[]>();
  const rootModules: ModuleRow[] = [];

  // First pass: organize modules
  modules.forEach(module => {
    moduleMap.set(module.id, module);
    
    if (module.parent_id) {
      const siblings = childrenMap.get(module.parent_id) || [];
      siblings.push(module);
      childrenMap.set(module.parent_id, siblings);
    } else {
      rootModules.push(module);
    }
  });

  // Sort by sort_order
  const sortModules = (a: ModuleRow, b: ModuleRow) => 
    (a.sort_order ?? 999) - (b.sort_order ?? 999);

  // Recursive function to build menu items
  function buildMenuItem(module: ModuleRow): MenuItem {
    const children = childrenMap.get(module.id) || [];
    children.sort(sortModules);

    const menuItem: MenuItem = {
      id: module.id,
      title: module.display_name,
      icon: getIcon(module.icon),
      description: module.description || undefined,
    };

    if (module.route) {
      menuItem.url = module.route;
    }

    if (children.length > 0) {
      menuItem.subItems = children.map(buildMenuItem);
    }

    return menuItem;
  }

  // Build the tree starting from root modules
  rootModules.sort(sortModules);
  return rootModules.map(buildMenuItem);
}

export function useDynamicNavigation() {
  const { user, isAdmin } = useSupabaseAuth();

  const {
    data: menuItems = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['dynamic-navigation', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Call the RPC function using raw SQL to avoid type issues
      const { data, error } = await supabase
        .rpc('get_user_accessible_modules' as any, { _user_id: user.id });

      if (error) {
        console.error('Failed to fetch accessible modules:', error);
        throw error;
      }

      return buildMenuTree((data as ModuleRow[]) || []);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  const isEmpty = !isLoading && !isError && menuItems.length === 0;

  return {
    menuItems,
    isLoading,
    isError,
    isEmpty,
    isAdmin,
    error,
    refetch
  };
}

// Hook to check if user can access a specific module
export function useCanAccessModule(moduleName: string) {
  const { user, isAdmin } = useSupabaseAuth();

  const { data: canAccess = false, isLoading } = useQuery({
    queryKey: ['can-access-module', user?.id, moduleName],
    queryFn: async () => {
      if (!user?.id) return false;
      if (isAdmin) return true;

      const { data, error } = await supabase
        .rpc('can_access_module' as any, { 
          _user_id: user.id, 
          _module_name: moduleName 
        });

      if (error) {
        console.error('Failed to check module access:', error);
        return false;
      }

      return (data as boolean) ?? false;
    },
    enabled: !!user?.id && !!moduleName,
    staleTime: 5 * 60 * 1000,
  });

  return { canAccess, isLoading, isAdmin };
}
