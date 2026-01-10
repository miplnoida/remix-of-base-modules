import { useDynamicNavigation, MenuItem } from '@/hooks/useDynamicNavigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarMenu } from '@/components/ui/sidebar';
import SidebarMenuGroup from './SidebarMenuGroup';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, FolderX, RefreshCw, User, KeyRound, Bell, MonitorSmartphone, Mail } from 'lucide-react';
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

export default function DynamicSidebarContent({ collapsed }: DynamicSidebarContentProps) {
  const { menuItems, isLoading, isError, isEmpty, refetch } = useDynamicNavigation();

  // Loading state
  if (isLoading) {
    return (
      <div className="px-3 py-4 space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            {!collapsed && <Skeleton className="h-4 flex-1" />}
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="px-4 py-6 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-3">
          Failed to load menu
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  // Even if no dynamic menu permissions, we still render the default menu items
  // The default menu items are always visible to all authenticated users

  return (
    <ScrollArea className="flex-1 px-3">
      <SidebarMenu className="py-2 space-y-1">
        {/* Dynamic menu items from permissions */}
        {menuItems.map((item: MenuItem) => (
          <SidebarMenuGroup 
            key={item.id} 
            item={item} 
            collapsed={collapsed} 
          />
        ))}
        
        {/* Separator between dynamic and default menus */}
        {menuItems.length > 0 && (
          <div className="py-2">
            <Separator className="bg-border/50" />
          </div>
        )}
        
        {/* Default menu items - always visible */}
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
