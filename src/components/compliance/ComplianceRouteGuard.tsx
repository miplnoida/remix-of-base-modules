import React from 'react';
import { Loader2 } from 'lucide-react';
import { useActionPermissions } from '@/hooks/useActionPermission';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { ComplianceFeatureGate } from '@/components/compliance/ComplianceFeatureGate';

/**
 * Compliance route guard.
 *
 * Enforces precedence:
 *   1. Auth (provided by ProtectedLayout upstream)
 *   2. Permission — has `view` on the given app_modules.name
 *   3. Feature flag — if flagKey provided, delegated to ComplianceFeatureGate
 *   4. Render page
 *
 * Unauthorized users always see <AccessDenied/> regardless of feature flag
 * state — they must not learn whether a gated feature is ON or OFF.
 */
interface Props {
  moduleName: string;
  flagKey?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const ComplianceRouteGuard: React.FC<Props> = ({
  moduleName,
  flagKey,
  title,
  description,
  children,
}) => {
  const { canView, isAdmin, isLoading } = useActionPermissions(moduleName);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin && !canView()) {
    return <AccessDenied />;
  }

  if (flagKey) {
    return (
      <ComplianceFeatureGate flagKey={flagKey} title={title} description={description}>
        {children}
      </ComplianceFeatureGate>
    );
  }

  return <>{children}</>;
};

export default ComplianceRouteGuard;
