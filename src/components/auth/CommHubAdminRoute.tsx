/**
 * CH-PERM-VERIFY-1 — Communication Hub admin route gate.
 *
 * Access is granted when ANY of the following hold:
 *   - user is an Admin (via `is_admin` RPC)
 *   - user has permission `system_administration.view`
 *   - user has permission `communication_hub.view`
 *
 * Behavior:
 *   - unauthenticated / no session → redirect to /login (preserves `from`)
 *   - authenticated but unpermitted → render a Not authorized screen
 *   - permissions still loading → non-blocking spinner
 *
 * This guard is intentionally UI-only. RLS remains the source of truth for
 * data access; this gate prevents authenticated non-admin users from reaching
 * Communication Hub admin screens by URL.
 */
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { useIsAdmin, useModulePermissions } from "@/hooks/useNavigationMenu";

interface CommHubAdminRouteProps {
  children: React.ReactNode;
}

export const CommHubAdminRoute: React.FC<CommHubAdminRouteProps> = ({ children }) => {
  const { isAuthenticated, isAuthReady, isLoading } = useSupabaseAuth();
  const isAdmin = useIsAdmin();
  const sysAdmin = useModulePermissions("system_administration");
  const commHub = useModulePermissions("communication_hub");
  const location = useLocation();

  if (isLoading || !isAuthReady) {
    return (
      <div
        data-testid="comm-hub-gate-loading"
        className="min-h-screen flex items-center justify-center bg-background"
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const permissionsLoading = sysAdmin.isLoading || commHub.isLoading;
  if (permissionsLoading && !isAdmin) {
    return (
      <div
        data-testid="comm-hub-gate-loading"
        className="min-h-screen flex items-center justify-center bg-background"
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const allowed =
    isAdmin || sysAdmin.hasPermission("view") || commHub.hasPermission("view");

  if (!allowed) {
    return (
      <div
        data-testid="comm-hub-not-authorized"
        className="min-h-screen flex items-center justify-center bg-background px-6"
      >
        <div className="max-w-md text-center space-y-3">
          <ShieldAlert className="h-10 w-10 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-semibold">Not authorized</h1>
          <p className="text-sm text-muted-foreground">
            You do not have permission to view Communication Hub admin screens.
            Contact your administrator if you believe this is a mistake.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default CommHubAdminRoute;
