
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(item.url);
  };

  const content = (
    <SidebarMenuButton
      asChild
      className={`group relative rounded-lg transition-all duration-200 ease-in-out font-medium h-11 ${
        isActive 
          ? "bg-sidebar-accent text-white shadow-sm border-l-4 border-accent" 
          : "text-white/80 hover:bg-sidebar-accent/60 hover:text-white"
      }`}
    >
      <a 
        href={item.url} 
        onClick={handleClick}
        className={`flex items-center gap-4 min-w-0 ${collapsed ? 'justify-center px-1' : 'px-1 py-3'}`}
      >
        <item.icon className={`h-5 w-5 flex-shrink-0 transition-colors ${
          isActive ? "text-accent" : "text-white/60 group-hover:text-white"
        }`} />
        {!collapsed && (
          <span className="truncate text-sm font-medium tracking-wide">
            {item.title}
          </span>
        )}
      </a>
    </SidebarMenuButton>
  );

  if (collapsed && item.description) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-foreground text-background border-border">
            <div>
              <div className="font-medium">{item.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{item.description}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};

export default SidebarMenuLink;
