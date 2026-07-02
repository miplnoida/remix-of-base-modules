import { Navigate } from "react-router-dom";

/**
 * Legacy predefined-reports page — retired in Legal Phase 1 cleanup.
 * All entries were hardcoded samples. Users are redirected to the
 * live Legal Reports hub, which Phase 11 will replace with the
 * Analytics Explorer.
 */
export default function LegalReports() {
  return <Navigate to="/legal/reports" replace />;
}
