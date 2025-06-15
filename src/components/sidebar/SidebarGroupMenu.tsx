
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/ui/sidebar";
import { NavLink } from "react-router-dom";
import { ChevronDown, ChevronRight } from "./sidebarMenuItems";

type SubItemType = {
  title: string;
  url: string;
  icon: React.ElementType;
  requiresPermission?: string;
};

interface Props {
  item: {
    title: string;
    icon: React.ElementType;
    subItems: SubItemType[];
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
}: Props) => (
  <Collapsible open={open} onOpenChange={toggle}>
    <CollapsibleTrigger asChild>
      <button
        type="button"
        className={`group w-full flex justify-between items-center px-4 py-3 rounded-lg transition-all duration-200 ease-in-out font-medium h-11 ${
          isGroupActive 
            ? "bg-government-50 text-government-800 border-l-4 border-government-600" 
            : "text-gray-700 hover:bg-gray-50 hover:text-government-700"
        }`}
        title={collapsed ? item.title : undefined}
      >
        <div className="flex items-center gap-4 min-w-0">
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

export default SidebarGroupMenu;
