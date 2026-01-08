
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { menuItems } from "./sidebar/sidebarMenuItems";
import SidebarMenuGroup from "./sidebar/SidebarMenuGroup";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigationMenu } from "@/hooks/useNavigationMenu";

// Type guards
type MenuItemWithSubItems = {
  title: string;
  icon: React.ElementType;
  alwaysVisible?: boolean;
  subItems: Array<{
    title: string;
    url: string;
    icon: React.ElementType;
    requiresPermission?: string;
    description?: string;
  }>;
};

const hasSubItems = (item: any): item is MenuItemWithSubItems => {
  return item.subItems && Array.isArray(item.subItems);
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const [openGroups, setOpenGroups] = useState<string[]>(['Dashboard']);
  const { user, profile } = useSupabaseAuth();
  const { currentTheme } = useTheme();
  const { menuItems: dynamicMenuItems, userPermissions, isLoading: navLoading, isAdmin } = useNavigationMenu();

  // Auto-expand groups containing active routes
  useEffect(() => {
    const activeGroup = menuItems.find(item => 
      hasSubItems(item) && item.subItems.some(subItem => subItem.url === currentPath)
    );
    
    if (activeGroup && !openGroups.includes(activeGroup.title)) {
      setOpenGroups(prev => [...prev, activeGroup.title]);
    }
  }, [currentPath, openGroups]);

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => 
      prev.includes(title) 
        ? prev.filter(group => group !== title)
        : [...prev, title]
    );
  };

  // Permission check helper - Admin always has access
  const checkPermission = (permission?: string) => {
    if (isAdmin) return true;
    if (!permission) return true;
    return userPermissions.some(p => 
      p.module_name === permission || p.action_name === permission
    );
  };

  // Filter menu items based on permissions - Admin sees everything
  const getVisibleMenuItems = () => {
    if (isAdmin) {
      return menuItems; // Admin sees all menu items
    }
    
    return menuItems.filter(item => {
      // Always show items marked as alwaysVisible (User Profile & Preferences)
      if ((item as any).alwaysVisible) return true;
      
      // Check if item requires permission
      const requiresPermission = 'requiresPermission' in item ? (item as any).requiresPermission : undefined;
      if (requiresPermission && !checkPermission(requiresPermission)) {
        return false;
      }
      
      // For items with subItems, check if at least one sub-item is accessible
      if (hasSubItems(item)) {
        const hasAccessibleChild = item.subItems.some(sub => {
          if (!sub.requiresPermission) return true;
          return checkPermission(sub.requiresPermission);
        });
        return hasAccessibleChild;
      }
      
      return true;
    });
  };

  const visibleMenuItems = getVisibleMenuItems();
  return (
    <Sidebar 
      className="border-r border-gray-200 bg-white shadow-lg transition-all duration-200 ease-in-out" 
      collapsible="icon"
    >
      {/* Header Section */}
      <SidebarHeader className="border-b border-gray-200 p-0">
        <div 
          className="p-4"
          style={{ 
            background: `linear-gradient(135deg, ${currentTheme.colors.primary} 0%, ${currentTheme.colors.secondary} 100%)` 
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0">
                <img 
                  src="/lovable-uploads/990576b3-f8e5-48e9-a203-ee949d3d0ae0.png" 
                  alt="SecureServe Logo" 
                  className="h-10 w-10 bg-white rounded-lg p-2 shadow-sm"
                />
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-lg text-white tracking-tight truncate">
                    SecureServe
                  </h2>
                  <p className="text-white/80 text-xs font-medium truncate">
                    Compliance Department
                  </p>
                </div>
              )}
            </div>
            <SidebarTrigger 
              className="text-white hover:bg-white/20 h-8 w-8 transition-colors" 
            />
          </div>
        </div>
      </SidebarHeader>

      {/* Main Content */}
      <SidebarContent className="p-0">
        <ScrollArea className="flex-1">
          <div className="px-3 py-4">
            <SidebarGroup>
              <SidebarMenu className="space-y-1">
                {visibleMenuItems.map((item) => (
                  <SidebarMenuGroup
                    key={item.title}
                    item={item}
                    collapsed={collapsed}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </div>
        </ScrollArea>
      </SidebarContent>

      {/* Footer Section */}
      {!collapsed && (
        <SidebarFooter className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-government-100 flex items-center justify-center">
              <span className="text-government-600 font-semibold text-sm">
                {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name || user?.email || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                Logged In
              </p>
            </div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
