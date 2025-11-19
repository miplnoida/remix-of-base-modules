import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import SidebarMenuLink from "./SidebarMenuLink";
import { cn } from "@/lib/utils";

interface SubItem {
  title: string;
  url?: string;
  icon: React.ElementType;
  requiresPermission?: string;
  subItems?: SubItem[];
}

interface MenuItem {
  title: string;
  url?: string;
  icon: React.ElementType;
  description?: string;
  requiresPermission?: string;
  subItems?: SubItem[];
}

interface SidebarMenuGroupProps {
  item: MenuItem;
  collapsed: boolean;
  level?: number;
}

export default function SidebarMenuGroup({ item, collapsed, level = 1 }: SidebarMenuGroupProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Check if any nested item is active
  const isAnyChildActive = (items?: SubItem[]): boolean => {
    if (!items) return false;
    return items.some(child => 
      (child.url && currentPath === child.url) || 
      isAnyChildActive(child.subItems)
    );
  };

  const hasActiveChild = isAnyChildActive(item.subItems);
  const [open, setOpen] = useState(hasActiveChild);

  // If this is a leaf node with a URL, render as link
  if (item.url && !item.subItems) {
    const isActive = currentPath === item.url;
    return (
      <SidebarMenuItem>
        <SidebarMenuLink 
          item={{ ...item, url: item.url }} 
          collapsed={collapsed} 
          isActive={isActive} 
        />
      </SidebarMenuItem>
    );
  }

  // Otherwise, render as collapsible group
  const indentClass = level === 1 ? "" : level === 2 ? "ml-4" : "ml-8";

  const groupButton = (
    <CollapsibleTrigger asChild>
      <SidebarMenuButton
        className={cn(
          "group w-full rounded-lg transition-all duration-200 ease-in-out font-medium h-11",
          indentClass,
          hasActiveChild 
            ? "bg-government-100 text-government-800 shadow-sm" 
            : "text-gray-700 hover:bg-gray-50 hover:text-government-700"
        )}
      >
        <div className="flex items-center gap-3 min-w-0 w-full">
          <item.icon className={cn(
            "h-5 w-5 flex-shrink-0 transition-colors",
            hasActiveChild ? "text-government-600" : "text-gray-500 group-hover:text-government-600"
          )} />
          {!collapsed && (
            <>
              <span className="truncate text-sm font-medium tracking-wide flex-1 text-left">
                {item.title}
              </span>
              {open ? (
                <ChevronDown className="h-4 w-4 flex-shrink-0 transition-transform" />
              ) : (
                <ChevronRight className="h-4 w-4 flex-shrink-0 transition-transform" />
              )}
            </>
          )}
        </div>
      </SidebarMenuButton>
    </CollapsibleTrigger>
  );

  const content = (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        {collapsed && item.description ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                {groupButton}
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-gray-900 text-white border-gray-700">
                <div>
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-gray-300 mt-1">{item.description}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          groupButton
        )}
      </SidebarMenuItem>
      
      <CollapsibleContent className="space-y-1">
        {item.subItems?.map((subItem) => (
          <SidebarMenuGroup
            key={subItem.title}
            item={subItem}
            collapsed={collapsed}
            level={level + 1}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );

  return content;
}
