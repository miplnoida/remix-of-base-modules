/**
 * Legacy Organization Management surface — Phase 2.
 *
 * The canonical UI now lives at `/admin/org/*` (see OrganizationManagementShell).
 * This file is kept ONLY as a redirector so bookmarks / deep links using
 * `/admin/organization-management?tab=...` land on the correct new route.
 *
 * Remove in Phase 8 (cleanup) once analytics show no residual traffic.
 */
import { useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";

const TAB_TO_ROUTE: Record<string, string> = {
  organization:      "/admin/org/foundation/profile",
  locations:         "/admin/org/foundation/locations",
  departments:       "/admin/org/foundation/departments",
  modules:           "/admin/org/foundation/modules",
  assets:            "/admin/org/assets/media",
  "asset-categories":"/admin/org/assets/categories",
  "text-blocks":     "/admin/org/library/text-blocks",
  assignments:       "/admin/org/configuration-center",
  usage:             "/admin/org/validation",
};

export default function OrganizationManagementAdmin() {
  const [params] = useSearchParams();
  const tab = params.get("tab") ?? "organization";
  const target = TAB_TO_ROUTE[tab] ?? "/admin/org/foundation/profile";

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.info(`[org-mgmt] Legacy ?tab=${tab} → ${target}`);
  }, [tab, target]);

  return <Navigate to={target} replace />;
}
