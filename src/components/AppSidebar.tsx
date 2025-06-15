
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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

// ----- type guards -----
type LinkItem = {
  title: string;
  url: string;
  icon: React.ElementType;
  subItems?: undefined;
};
type GroupItem = {
  title: string;
  icon: React.ElementType;
  subItems: LinkItem[];
};
function isGroup(item: LinkItem | GroupItem): item is GroupItem {
  return Array.isArray((item as GroupItem).subItems);
}
function isLink(item: LinkItem | GroupItem): item is LinkItem {
  return typeof (item as LinkItem).url === "string";
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const [openGroups, setOpenGroups] = useState<string[]>(['Dashboard']);
  const { hasPermission } = useAuth();

  const toggleGroup = (title: string) => {
    setOpenGroups(prev =>
      prev.includes(title)
        ? prev.filter(group => group !== title)
        : [...prev, title]
    );
  };

  const isActive = (path: string) => currentPath === path;
  const isGroupActive = (subItems: LinkItem[]) =>
    subItems?.some(item => isActive(item.url));

  return (
    <Sidebar className="border-r bg-white shadow-sm" collapsible="icon">
      <div className="p-4 border-b bg-green-900 text-white">
        <div className="flex items-center gap-3">
          <img
            src="/lovable-uploads/990576b3-f8e5-48e9-a203-ee949d3d0ae0.png"
            alt="SecureServe Logo"
            className="h-8 w-8 bg-white rounded p-1 flex-shrink-0"
          />
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="font-bold text-lg truncate">SecureServe</h2>
              <p className="text-green-200 text-sm truncate">Management System</p>
            </div>
          )}
        </div>
      </div>

      <SidebarContent className="p-0">
        <div className="p-4">
          <SidebarTrigger className="mb-4" />
        </div>

        <SidebarGroup>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                {isGroup(item) ? (
                  <SidebarGroupMenu
                    item={item}
                    collapsed={collapsed}
                    open={openGroups.includes(item.title)}
                    toggle={() => toggleGroup(item.title)}
                    isGroupActive={isGroupActive(item.subItems)}
                    hasPermission={hasPermission}
                    currentPath={currentPath}
                  />
                ) : isLink(item) ? (
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
