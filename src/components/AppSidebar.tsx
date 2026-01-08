import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Sidebar,
  SidebarContent,
  SidebarTrigger,
  useSidebar,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import DynamicSidebarContent from "./sidebar/DynamicSidebarContent";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, profile } = useSupabaseAuth();
  const { currentTheme } = useTheme();

  return (
    <Sidebar 
      className="border-r border-gray-200 bg-white shadow-lg transition-all duration-200 ease-in-out" 
      collapsible="icon"
    >
      {/* Header Section */}
      <SidebarHeader className="border-b border-gray-200 p-0">
        <div 
          className="p-4"
          style={{ 
            background: `linear-gradient(135deg, ${currentTheme.colors.primary} 0%, ${currentTheme.colors.secondary} 100%)` 
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0">
                <img 
                  src="/lovable-uploads/990576b3-f8e5-48e9-a203-ee949d3d0ae0.png" 
                  alt="SecureServe Logo" 
                  className="h-10 w-10 bg-white rounded-lg p-2 shadow-sm"
                />
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-lg text-white tracking-tight truncate">
                    SecureServe
                  </h2>
                  <p className="text-white/80 text-xs font-medium truncate">
                    Compliance Department
                  </p>
                </div>
              )}
            </div>
            <SidebarTrigger 
              className="text-white hover:bg-white/20 h-8 w-8 transition-colors" 
            />
          </div>
        </div>
      </SidebarHeader>

      {/* Main Content - Dynamic Navigation */}
      <SidebarContent className="p-0">
        <DynamicSidebarContent collapsed={collapsed} />
      </SidebarContent>

      {/* Footer Section */}
      {!collapsed && (
        <SidebarFooter className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-government-100 flex items-center justify-center">
              <span className="text-government-600 font-semibold text-sm">
                {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name || user?.email || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                Logged In
              </p>
            </div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
