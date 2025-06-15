
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/ui/sidebar";
import { NavLink } from "react-router-dom";
import { ChevronDown, ChevronRight } from "./sidebarMenuItems";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type SubItemType = {
  title: string;
  url: string;
  icon: React.ElementType;
  requiresPermission?: string;
  description?: string;
};

interface Props {
  item: {
    title: string;
    icon: React.ElementType;
    subItems: SubItemType[];
    description?: string;
  };
  collapsed: boolean;
  open: boolean;
  toggle: () => void;
  isGroupActive: boolean;
  hasPermission: (perm: string) => boolean;
  currentPath: string;
}

const SidebarGroupMenu = ({
  item,
  collapsed,
  open,
  toggle,
  isGroupActive,
  hasPermission,
  currentPath,
}: Props) => {
  const mainButton = (
    <CollapsibleTrigger asChild>
      <button
        type="button"
        className={`group w-full flex justify-between items-center rounded-lg transition-all duration-200 ease-in-out font-medium h-11 ${
          collapsed ? 'px-2 justify-center' : 'px-4 py-3'
        } ${
          isGroupActive 
            ? "bg-government-50 text-government-800 border-l-4 border-government-600" 
            : "text-gray-700 hover:bg-gray-50 hover:text-government-700"
        }`}
      >
        <div className={`flex items-center min-w-0 ${collapsed ? 'justify-center' : 'gap-4'}`}>
          <item.icon className={`h-5 w-5 flex-shrink-0 transition-colors ${
            isGroupActive ? "text-government-600" : "text-gray-500 group-hover:text-government-600"
          }`} />
          {!collapsed && (
            <span className="truncate text-sm font-medium tracking-wide">
              {item.title}
            </span>
          )}
        </div>
        {!collapsed && (
          <div className={`transition-transform duration-200 ${open ? "rotate-0" : ""}`}>
            {open ? (
              <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-government-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-government-500" />
            )}
          </div>
        )}
      </button>
    </CollapsibleTrigger>
  );

  return (
    <Collapsible open={open} onOpenChange={toggle}>
      {collapsed && item.description ? (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              {mainButton}
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
        mainButton
      )}
      
      {!collapsed && (
        <CollapsibleContent className="overflow-hidden transition-all duration-200 ease-in-out">
          <SidebarMenuSub className="ml-8 mt-2 space-y-1 border-l-2 border-gray-100 pl-4">
            {item.subItems
              .filter(subItem => !subItem.requiresPermission || hasPermission(subItem.requiresPermission))
              .map(subItem => (
                <SidebarMenuSubItem key={subItem.title}>
                  <SidebarMenuSubButton
                    asChild
                    className={`group rounded-md transition-all duration-200 h-9 ${
                      currentPath === subItem.url
                        ? "bg-government-100 text-government-800 border-l-2 border-government-500"
                        : "text-gray-600 hover:bg-gray-50 hover:text-government-700"
                    }`}
                    title={subItem.description}
                  >
                    <NavLink to={subItem.url} className="flex items-center gap-3 px-3 py-2 min-w-0">
                      <subItem.icon className={`h-4 w-4 flex-shrink-0 transition-colors ${
                        currentPath === subItem.url ? "text-government-600" : "text-gray-400 group-hover:text-government-500"
                      }`} />
                      <span className="truncate text-sm font-medium">
                        {subItem.title}
                      </span>
                    </NavLink>
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
