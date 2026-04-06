import { useState, useEffect, useRef } from 'react';
import { useDynamicNavigation, MenuItem } from '@/hooks/useDynamicNavigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarMenu } from '@/components/ui/sidebar';
import SidebarMenuGroup from './SidebarMenuGroup';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, User, KeyRound, Bell, MonitorSmartphone, Mail, LayoutDashboard, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface DynamicSidebarContentProps {
  collapsed: boolean;
}

// Default menu items always visible to all users regardless of permissions
const defaultMenuItems: MenuItem[] = [
  {
    id: 'user-profile-preferences',
    title: 'User Profile & Preferences',
    icon: User,
    description: 'Manage your profile and preferences',
    subItems: [
      {
        id: 'my-profile',
        title: 'My Profile',
        url: '/profile',
        icon: User,
        description: 'View and edit your profile',
      },
      {
        id: 'change-password',
        title: 'Change Password',
        url: '/profile/change-password',
        icon: KeyRound,
        description: 'Update your password',
      },
      {
        id: 'notification-preferences',
        title: 'Notification Preferences',
        url: '/profile/notifications',
        icon: Bell,
        description: 'Manage notification settings',
      },
      {
        id: 'active-sessions',
        title: 'Active Sessions',
        url: '/profile/sessions',
        icon: MonitorSmartphone,
        description: 'View and manage active sessions',
      },
      {
        id: 'notification-center',
        title: 'Notification Center',
        url: '/notifications/center',
        icon: Mail,
        description: 'View all your notifications',
      },
    ],
  },
];

// Session-level cache key for last-known-good dynamic menu
const MENU_CACHE_KEY = 'dynamic-nav-cache';

function getCachedMenu(): MenuItem[] | null {
  try {
    const cached = sessionStorage.getItem(MENU_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function setCachedMenu(items: MenuItem[]) {
  try {
    sessionStorage.setItem(MENU_CACHE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors
  }
}

export default function DynamicSidebarContent({ collapsed }: DynamicSidebarContentProps) {
  const { menuItems, isLoading, isError, isEmpty, refetch } = useDynamicNavigation();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const lastGoodMenuRef = useRef<MenuItem[]>(getCachedMenu() || []);

  // Cache last-known-good menu items
  useEffect(() => {
    if (menuItems.length > 0) {
      lastGoodMenuRef.current = menuItems;
      setCachedMenu(menuItems);
    }
  }, [menuItems]);

  // If loading takes more than 15s, show a timeout fallback instead of infinite skeletons
  useEffect(() => {
    if (!isLoading) {
      setLoadingTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setLoadingTimedOut(true), 15_000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Determine which dynamic items to display
  const displayDynamicItems = isError || loadingTimedOut
    ? lastGoodMenuRef.current // Use cached menu on error
    : menuItems;

  // Show skeletons only while loading and not timed out
  const showSkeletons = isLoading && !loadingTimedOut && displayDynamicItems.length === 0;

  return (
    <ScrollArea className="flex-1 px-3">
      <SidebarMenu className="py-2 space-y-1">
        {/* Dynamic menu items — from live data or last-known-good cache */}
        {showSkeletons ? (
          <div className="space-y-3 px-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                {!collapsed && <Skeleton className="h-4 flex-1" />}
              </div>
            ))}
          </div>
        ) : (
          <>
            {displayDynamicItems.map((item: MenuItem) => (
              <SidebarMenuGroup
                key={item.id}
                item={item}
                collapsed={collapsed}
              />
            ))}
          </>
        )}

        {/* Compact inline warning when dynamic menu failed but cached items shown */}
        {(isError || loadingTimedOut) && displayDynamicItems.length > 0 && (
          <div className="px-2 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLoadingTimedOut(false);
                refetch();
              }}
              className="w-full gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3" />
              {!collapsed && 'Refresh menu'}
            </Button>
          </div>
        )}

        {/* Error state with NO cached fallback — show retry */}
        {(isError || loadingTimedOut) && displayDynamicItems.length === 0 && (
          <div className="px-4 py-4 text-center">
            <AlertCircle className="h-6 w-6 text-destructive mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-2">
              {loadingTimedOut ? 'Menu is taking too long to load' : 'Failed to load menu'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoadingTimedOut(false);
                refetch();
              }}
              className="gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
          </div>
        )}

        {/* "No modules assigned" when RPC succeeds with zero items */}
        {isEmpty && !isLoading && !isError && !loadingTimedOut && (
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">No modules assigned</p>
          </div>
        )}

        {/* Separator between dynamic and default menus */}
        {(displayDynamicItems.length > 0 || showSkeletons) && (
          <div className="py-2">
            <Separator className="bg-border/50" />
          </div>
        )}

        {/* Default menu items - ALWAYS visible regardless of dynamic menu state */}
        {defaultMenuItems.map((item: MenuItem) => (
          <SidebarMenuGroup
            key={item.id}
            item={item}
            collapsed={collapsed}
          />
        ))}
      </SidebarMenu>
    </ScrollArea>
  );
}
