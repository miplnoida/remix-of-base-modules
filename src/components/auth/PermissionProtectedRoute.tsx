import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useCanAccessModule } from '@/hooks/useDynamicNavigation';
import { Loader2 } from 'lucide-react';

interface PermissionProtectedRouteProps {
  children: React.ReactNode;
  moduleName?: string;
  fallbackPath?: string;
}

export const PermissionProtectedRoute: React.FC<PermissionProtectedRouteProps> = ({
  children,
  moduleName,
  fallbackPath = '/unauthorized'
}) => {
  const { isAuthenticated, isLoading: authLoading } = useSupabaseAuth();
  const { canAccess, isLoading: permissionLoading, isAdmin } = useCanAccessModule(moduleName || '');

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If no module name specified, just check authentication
  if (!moduleName) {
    return <>{children}</>;
  }

  // Show loading while checking permissions
  if (permissionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Admin can access everything
  if (isAdmin) {
    return <>{children}</>;
  }

  // Check if user has permission
  if (!canAccess) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};
