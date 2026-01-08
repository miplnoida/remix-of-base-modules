import { useDynamicNavigation, MenuItem } from '@/hooks/useDynamicNavigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarMenu } from '@/components/ui/sidebar';
import SidebarMenuGroup from './SidebarMenuGroup';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, FolderX, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DynamicSidebarContentProps {
  collapsed: boolean;
}

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

  // Empty state - no permissions
  if (isEmpty) {
    return (
      <div className="px-4 py-6 text-center">
        <FolderX className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          {collapsed ? '' : "You don't have access to any modules. Please contact your administrator."}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-3">
      <SidebarMenu className="py-2 space-y-1">
        {menuItems.map((item: MenuItem) => (
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
