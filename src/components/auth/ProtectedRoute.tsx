
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

const TIMEOUT_WARNING_MS = 10_000;
const TIMEOUT_RETRY_MS = 20_000;

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredPermission 
}) => {
  const { isAuthenticated, isLoading } = useSupabaseAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowWarning(false);
      setShowRetry(false);
      return;
    }

    const warningTimer = setTimeout(() => setShowWarning(true), TIMEOUT_WARNING_MS);
    const retryTimer = setTimeout(() => setShowRetry(true), TIMEOUT_RETRY_MS);

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(retryTimer);
    };
  }, [isLoading]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          {!showWarning && <p className="text-muted-foreground">Loading...</p>}
          {showWarning && !showRetry && (
            <p className="text-muted-foreground">Taking longer than expected...</p>
          )}
          {showRetry && (
            <>
              <p className="text-muted-foreground">Still loading. You can retry or go to login.</p>
              <div className="flex gap-3 justify-center mt-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { window.location.href = '/login'; }}
                >
                  Go to Login
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Note: Permission checks can be handled at component level if needed
  return <>{children}</>;
};
