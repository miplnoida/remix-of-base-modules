import React from 'react';
import { useActionPermissions } from '@/hooks/useActionPermission';
import { Loader2 } from 'lucide-react';
import { AccessDenied } from '@/components/auth/AccessDenied';

interface PermissionWrapperProps {
  moduleName: string;
  children: React.ReactNode;
  loadingMessage?: string;
}

/**
 * Wrapper component that checks if the user has 'view' permission for a module.
 * Shows loading state while checking, access denied if no permission.
 * Admin users always have access.
 */
export function PermissionWrapper({
  moduleName,
  children,
  loadingMessage = "Checking permissions..."
}: PermissionWrapperProps) {
  const { canView, isLoading, isAdmin, error } = useActionPermissions(moduleName);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          <p className="font-medium">Failed to load permissions</p>
          <p className="text-sm mt-1">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  // Admin users always have access
  if (!isAdmin && !canView()) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
