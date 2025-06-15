
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/ui/sidebar";
import { NavLink } from "react-router-dom";
import { ChevronDown, ChevronRight } from "./sidebarMenuItems";
import SidebarMenuLink from "./SidebarMenuLink";

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
        className={`w-full flex justify-between items-center hover:bg-green-50 hover:text-green-700 transition-colors ${
          isGroupActive ? "bg-green-100 text-green-700 font-medium" : ""
        }`}
        title={collapsed ? item.title : undefined}
      >
        <div className="flex items-center gap-3 min-w-0">
          <item.icon className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="truncate">{item.title}</span>}
        </div>
        {!collapsed &&
          (open ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
          ))}
      </button>
    </CollapsibleTrigger>
    {!collapsed && (
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.subItems
            .filter(subItem => !subItem.requiresPermission || hasPermission(subItem.requiresPermission))
            .map(subItem => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  asChild
                  className={`hover:bg-green-50 hover:text-green-700 transition-colors ${
                    currentPath === subItem.url
                      ? "bg-green-100 text-green-700 font-medium border-r-2 border-green-500"
                      : ""
                  }`}
                >
                  <NavLink to={subItem.url} className="flex items-center gap-3 pl-8 min-w-0">
                    <subItem.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{subItem.title}</span>
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
