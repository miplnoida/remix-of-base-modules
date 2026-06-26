import { Outlet, useLocation } from "react-router-dom";
import { useLegalCapability } from "@/hooks/legal/useLegalCapability";
import { getRequiredLegalCap, userCanAccessLegalRoute } from "@/config/legalRouteCapabilities";
import LegalAccessDenied from "./LegalAccessDenied";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level guard for every /legal/* and /legal-advanced/* screen.
 * - Shows a skeleton while role lookup resolves.
 * - Renders <Outlet/> when the user has the required capability.
 * - Renders <LegalAccessDenied/> otherwise (never silently redirects to dashboard).
 */
export default function LegalRouteGuard() {
  const location = useLocation();
  const { capability, isLoading, isReady } = useLegalCapability();

  if (isLoading || !isReady) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const allowed = userCanAccessLegalRoute(location.pathname, capability);
  if (!allowed) {
    return (
      <LegalAccessDenied
        role={capability.role}
        requiredCap={getRequiredLegalCap(location.pathname)}
        pathname={location.pathname}
      />
    );
  }

  return <Outlet />;
}
