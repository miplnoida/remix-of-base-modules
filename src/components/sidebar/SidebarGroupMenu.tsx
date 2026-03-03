
import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { 
  SidebarMenuButton, 
  SidebarMenuSub, 
  SidebarMenuSubButton, 
  SidebarMenuSubItem
} from '@/components/ui/sidebar';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface SidebarGroupMenuProps {
  item: {
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
  collapsed: boolean;
  open: boolean;
  toggle: () => void;
  isGroupActive: boolean;
  hasPermission: (permission: string) => boolean;
  currentPath: string;
}

const SidebarGroupMenu: React.FC<SidebarGroupMenuProps> = ({
  item,
  collapsed,
  open,
  toggle,
  isGroupActive,
  hasPermission,
  currentPath
}) => {
  const isActive = (path: string) => {
    if (path === "/person/management") {
      return currentPath === "/person/management" || currentPath === "/person/register-tabs";
    }
    return currentPath === path;
  };

  const visibleSubItems = item.subItems.filter(subItem => 
    !subItem.requiresPermission || hasPermission(subItem.requiresPermission)
  );

  if (visibleSubItems.length === 0) {
    return null;
  }

  const totalNotifications = visibleSubItems.reduce((sum, item) => 
    sum + (item.notificationCount || 0), 0
  );

  return (
    <Collapsible open={open} onOpenChange={toggle}>
      <CollapsibleTrigger asChild>
        <SidebarMenuButton 
          className={`group relative px-3 py-3 rounded-lg transition-all duration-200 ease-in-out font-medium text-sm ${
            isGroupActive 
              ? 'bg-sidebar-accent text-white shadow-sm border-l-4 border-accent' 
              : 'text-white/80 hover:bg-sidebar-accent/60 hover:text-white'
          }`}
        >
          <item.icon className={`h-5 w-5 flex-shrink-0 transition-colors ${
            isGroupActive ? "text-accent" : "text-white/60 group-hover:text-white"
          }`} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left truncate">{item.title}</span>
              <div className="flex items-center gap-2">
                {totalNotifications > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 text-xs px-1.5">
                    {totalNotifications > 99 ? '99+' : totalNotifications}
                  </Badge>
                )}
                {open ? (
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 text-white/50" />
                ) : (
                  <ChevronRight className="h-4 w-4 transition-transform duration-200 text-white/50" />
                )}
              </div>
            </>
          )}
        </SidebarMenuButton>
      </CollapsibleTrigger>
      
      {!collapsed && (
        <CollapsibleContent className="overflow-hidden transition-all duration-200 ease-in-out">
          <SidebarMenuSub className="mx-2 border-l-2 border-white/20 px-3 py-2 space-y-1">
            {visibleSubItems.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton asChild>
                  <Link 
                    to={subItem.url}
                    className={`group flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-all duration-200 ease-in-out relative ${
                      isActive(subItem.url)
                        ? 'bg-accent text-foreground shadow-sm font-semibold'
                        : 'text-white/70 hover:bg-sidebar-accent/50 hover:text-white'
                    }`}
                    title={subItem.description}
                  >
                    <subItem.icon className={`h-4 w-4 flex-shrink-0 transition-colors ${
                      isActive(subItem.url) 
                        ? "text-foreground" 
                        : "text-white/50 group-hover:text-white"
                    }`} />
                    <span className="truncate font-medium">{subItem.title}</span>
                    {subItem.notificationCount && subItem.notificationCount > 0 && (
                      <Badge 
                        variant={isActive(subItem.url) ? "secondary" : "destructive"} 
                        className="h-5 min-w-5 text-xs px-1.5 ml-auto"
                      >
                        {subItem.notificationCount > 99 ? '99+' : subItem.notificationCount}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
};

export default SidebarGroupMenu;
