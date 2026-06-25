import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useLegalAdvancedEnabled } from '@/hooks/legal-advanced/useLegalAdvancedEnabled';

/**
 * Renders children only when the `legal_advanced_enabled` feature flag is on.
 * Redirects to /legal/dashboard when disabled — preserves existing Legal UX.
 */
export function LegalAdvancedGate({ children }: { children: ReactNode }) {
  const { enabled, isLoading } = useLegalAdvancedEnabled();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!enabled) return <Navigate to="/legal/dashboard" replace />;
  return <>{children}</>;
}
