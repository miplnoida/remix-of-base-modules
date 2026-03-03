import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
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

  return (
    <Sidebar 
      className="border-r-0 bg-sidebar text-sidebar-foreground shadow-xl transition-all duration-200 ease-in-out" 
      collapsible="icon"
    >
      {/* Header Section */}
      <SidebarHeader className="border-b border-sidebar-border p-0">
        <div className="px-4 py-5 bg-sidebar">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0">
                <img 
                  src="/images/ssb-logo.png" 
                  alt="SSB Logo" 
                  className="h-10 w-10 object-contain"
                />
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-base text-sidebar-foreground tracking-tight truncate">
                    SSB Portal
                  </h2>
                  <p className="text-sidebar-foreground/70 text-xs font-medium truncate">
                    St. Christopher & Nevis
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarHeader>

      {/* Main Content - Dynamic Navigation */}
      <SidebarContent className="p-0">
        <DynamicSidebarContent collapsed={collapsed} />
      </SidebarContent>

      {/* Footer Section */}
      {!collapsed && (
        <SidebarFooter className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sidebar-foreground font-semibold text-sm">
                {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name || user?.email || 'User'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                Logged In
              </p>
            </div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
