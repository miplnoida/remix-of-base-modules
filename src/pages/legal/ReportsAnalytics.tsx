import { Navigate } from "react-router-dom";

/**
 * Legacy static reports page — retired in Legal Phase 1 cleanup.
 * Replaced by the Legal Reports hub (Phase 11 will convert it into the
 * live Analytics Explorer). Kept as a redirect to preserve deep links.
 */
export default function ReportsAnalytics() {
  return <Navigate to="/legal/reports" replace />;
}
