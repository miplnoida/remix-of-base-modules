
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { NavLink } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarMenuLinkProps {
  item: {
    url: string;
    title: string;
    icon: React.ElementType;
    description?: string;
  };
  collapsed: boolean;
  isActive: boolean;
}

const SidebarMenuLink = ({ item, collapsed, isActive }: SidebarMenuLinkProps) => {
  const content = (
    <SidebarMenuButton
      asChild
      className={`group relative rounded-lg transition-all duration-200 ease-in-out font-medium h-11 ${
        isActive 
          ? "bg-government-100 text-government-800 shadow-sm border-l-4 border-government-600" 
          : "text-gray-700 hover:bg-gray-50 hover:text-government-700"
      }`}
    >
      <NavLink to={item.url} className={`flex items-center gap-4 min-w-0 ${collapsed ? 'justify-center px-1' : 'px-1 py-3'}`}>
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

  if (collapsed && item.description) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-gray-900 text-white border-gray-700">
            <div>
              <div className="font-medium">{item.title}</div>
              <div className="text-xs text-gray-300 mt-1">{item.description}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};

export default SidebarMenuLink;
