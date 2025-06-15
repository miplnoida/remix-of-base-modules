
import { useState } from "react";
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
} from "@/components/ui/sidebar";
import { menuItems } from "./sidebar/sidebarMenuItems";
import SidebarGroupMenu from "./sidebar/SidebarGroupMenu";
import SidebarMenuLink from "./sidebar/SidebarMenuLink";

// Type guards to help TypeScript understand the item types
type MenuItemWithSubItems = {
  title: string;
  icon: React.ElementType;
  subItems: Array<{
    title: string;
    url: string;
    icon: React.ElementType;
    requiresPermission?: string;
  }>;
};

type MenuItemWithUrl = {
  title: string;
  url: string;
  icon: React.ElementType;
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
  const { hasPermission } = useAuth();
  const { currentTheme } = useTheme();

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
    <Sidebar className="border-r border-gray-200 bg-white shadow-lg" collapsible="icon">
      {/* Header Section */}
      <div 
        className="border-b border-gray-200"
        style={{ 
          background: `linear-gradient(135deg, ${currentTheme.colors.primary} 0%, ${currentTheme.colors.secondary} 100%)` 
        }}
      >
        <div className="flex items-center justify-between p-4">
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
                  Social Security System
                </p>
              </div>
            )}
          </div>
          <SidebarTrigger 
            className="text-white hover:bg-white/20 h-8 w-8" 
          />
        </div>
      </div>

      <SidebarContent className="px-4 py-4">
        <SidebarGroup>
          <SidebarMenu className="space-y-2">
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
      </SidebarContent>
    </Sidebar>
  );
}
