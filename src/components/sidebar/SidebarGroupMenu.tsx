
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

interface SidebarGroupMenuProps {
  item: {
    title: string;
    icon: React.ElementType;
    subItems: Array<{
      title: string;
      url: string;
      icon: React.ElementType;
      requiresPermission?: string;
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

  return (
    <Collapsible open={open} onOpenChange={toggle}>
      <CollapsibleTrigger asChild>
        <SidebarMenuButton 
          className={`group px-1 ${isGroupActive ? 'bg-government-100 text-government-700' : 'hover:bg-gray-100'}`}
        >
          <item.icon className="h-4 w-4" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.title}</span>
              {open ? (
                <ChevronDown className="h-4 w-4 transition-transform" />
              ) : (
                <ChevronRight className="h-4 w-4 transition-transform" />
              )}
            </>
          )}
        </SidebarMenuButton>
      </CollapsibleTrigger>
      
      {!collapsed && (
        <CollapsibleContent>
          <SidebarMenuSub className="mx-0.5 border-l border-sidebar-border px-1 py-0.5">
            {visibleSubItems.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton asChild>
                  <Link 
                    to={subItem.url}
                    className={`flex items-center gap-3 px-1 py-2 text-sm rounded-md transition-colors ${
                      isActive(subItem.url)
                        ? 'bg-government-500 text-white'
                        : 'text-gray-700 hover:bg-government-50 hover:text-government-700'
                    }`}
                  >
                    <subItem.icon className="h-3 w-3" />
                    <span>{subItem.title}</span>
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
