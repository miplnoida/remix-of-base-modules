
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { NavLink } from "react-router-dom";

interface SidebarMenuLinkProps {
  item: {
    url: string;
    title: string;
    icon: React.ElementType;
  };
  collapsed: boolean;
  isActive: boolean;
}

const SidebarMenuLink = ({ item, collapsed, isActive }: SidebarMenuLinkProps) => (
  <SidebarMenuButton
    asChild
    className={`hover:bg-green-50 hover:text-green-700 transition-colors ${
      isActive ? "bg-green-100 text-green-700 font-medium border-r-2 border-green-500" : ""
    }`}
    tooltip={collapsed ? item.title : undefined}
  >
    <NavLink to={item.url} className="flex items-center gap-3 min-w-0">
      <item.icon className="h-5 w-5 flex-shrink-0"/>
      {!collapsed && <span className="truncate">{item.title}</span>}
    </NavLink>
  </SidebarMenuButton>
);

export default SidebarMenuLink;
