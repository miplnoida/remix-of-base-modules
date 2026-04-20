import { Navigate } from 'react-router-dom';
import { useComplianceRole } from '@/hooks/useComplianceRole';

/**
 * Single canonical entry point for the Compliance & Enforcement Workbench.
 * Redirects to the dashboard most relevant for the user's operational role.
 */
export default function WorkbenchLanding() {
  const role = useComplianceRole();

  switch (role) {
    case 'inspector':
      return <Navigate to="/compliance/workbench/inspector" replace />;
    case 'senior':
    case 'head':
      return <Navigate to="/compliance/workbench/manager" replace />;
    default:
      return <Navigate to="/compliance/workbench/manager" replace />;
  }
}
