
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
import SidebarGroupMenu from "./sidebar/SidebarGroupMenu";
import SidebarMenuLink from "./sidebar/SidebarMenuLink";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Type guards to help TypeScript understand the item types
type MenuItemWithSubItems = {
  title: string;
  icon: React.ElementType;
  subItems: Array<{
    title: string;
    url: string;
    icon: React.ElementType;
    requiresPermission?: string;
    description?: string;
    notificationCount?: number;
  }>;
};

type MenuItemWithUrl = {
  title: string;
  url: string;
  icon: React.ElementType;
  description?: string;
};

const hasSubItems = (item: any): item is MenuItemWithSubItems => {
  return item.subItems && Array.isArray(item.subItems);
};

const hasUrl = (item: any): item is MenuItemWithUrl => {
  return typeof item.url === 'string';
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const [openGroups, setOpenGroups] = useState<string[]>(['Dashboard']);
  const { hasPermission, user } = useAuth();
  const { currentTheme } = useTheme();

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

  const isActive = (path: string) => currentPath === path;
  const isGroupActive = (subItems: any[]) => 
    subItems?.some(item => isActive(item.url));

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
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {hasSubItems(item) ? (
                      <SidebarGroupMenu 
                        item={item} 
                        collapsed={collapsed}
                        open={openGroups.includes(item.title)}
                        toggle={() => toggleGroup(item.title)}
                        isGroupActive={isGroupActive(item.subItems)}
                        hasPermission={hasPermission}
                        currentPath={currentPath}
                      />
                    ) : hasUrl(item) ? (
                      <SidebarMenuLink 
                        item={item}
                        collapsed={collapsed}
                        isActive={isActive(item.url)} 
                      />
                    ) : null}
                  </SidebarMenuItem>
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
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.role || 'Compliance Officer'}
              </p>
            </div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
