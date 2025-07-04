
import React from 'react';
import { ChevronDown, ChevronRight, Bell } from 'lucide-react';
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
  const isActive = (path: string) => currentPath === path;

  // Filter sub-items based on permissions
  const visibleSubItems = item.subItems.filter(subItem => 
    !subItem.requiresPermission || hasPermission(subItem.requiresPermission)
  );

  // Don't render if no sub-items are visible
  if (visibleSubItems.length === 0) {
    return null;
  }

  // Calculate total notifications for this group
  const totalNotifications = visibleSubItems.reduce((sum, item) => 
    sum + (item.notificationCount || 0), 0
  );

  return (
    <Collapsible open={open} onOpenChange={toggle}>
      <CollapsibleTrigger asChild>
        <SidebarMenuButton 
          className={`group relative px-3 py-3 rounded-lg transition-all duration-200 ease-in-out font-medium text-sm ${
            isGroupActive 
              ? 'bg-government-100 text-government-800 shadow-sm border-l-4 border-government-600' 
              : 'text-gray-700 hover:bg-gray-50 hover:text-government-700'
          }`}
        >
          <item.icon className={`h-5 w-5 flex-shrink-0 transition-colors ${
            isGroupActive ? "text-government-600" : "text-gray-500 group-hover:text-government-600"
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
                  <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                ) : (
                  <ChevronRight className="h-4 w-4 transition-transform duration-200" />
                )}
              </div>
            </>
          )}
        </SidebarMenuButton>
      </CollapsibleTrigger>
      
      {!collapsed && (
        <CollapsibleContent className="overflow-hidden transition-all duration-200 ease-in-out">
          <SidebarMenuSub className="mx-2 border-l-2 border-government-200 px-3 py-2 space-y-1">
            {visibleSubItems.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton asChild>
                  <Link 
                    to={subItem.url}
                    className={`group flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-all duration-200 ease-in-out relative ${
                      isActive(subItem.url)
                        ? 'bg-government-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-government-50 hover:text-government-700'
                    }`}
                    title={subItem.description}
                  >
                    <subItem.icon className={`h-4 w-4 flex-shrink-0 transition-colors ${
                      isActive(subItem.url) 
                        ? "text-white" 
                        : "text-gray-500 group-hover:text-government-600"
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
