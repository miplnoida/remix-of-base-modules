/** @deprecated Legal V1 legacy — retired 2026-07. Superseded by LgReportsHub. See docs/legal/LEGAL_LEGACY_RETIREMENT_AUDIT.md. */
import { Navigate } from "react-router-dom";

/**
 * Legacy SSB reports page — retired in Legal Phase 1 cleanup.
 * Redirects to the live Legal Reports hub (to become Analytics Explorer in Phase 11).
 */
export default function SSBLegalReports() {
  return <Navigate to="/legal/reports" replace />;
}
