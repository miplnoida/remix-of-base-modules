
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
    className={`group relative rounded-lg transition-all duration-200 ease-in-out font-medium h-11 ${
      isActive 
        ? "bg-government-100 text-government-800 shadow-sm border-l-4 border-government-600" 
        : "text-gray-700 hover:bg-gray-50 hover:text-government-700"
    }`}
    tooltip={collapsed ? item.title : undefined}
  >
    <NavLink to={item.url} className="flex items-center gap-4 px-4 py-3 min-w-0">
      <item.icon className={`h-5 w-5 flex-shrink-0 transition-colors ${
        isActive ? "text-government-600" : "text-gray-500 group-hover:text-government-600"
      }`} />
      {!collapsed && (
        <span className="truncate text-sm font-medium tracking-wide">
          {item.title}
        </span>
      )}
    </NavLink>
  </SidebarMenuButton>
);

export default SidebarMenuLink;
