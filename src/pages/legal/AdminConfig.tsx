import { Navigate } from "react-router-dom";

// Legal Admin items are now exposed as sidebar sub-menu (Legal → Legal Admin).
// Landing on /legal/admin redirects to the first sub-item.
export default function AdminConfig() {
  return <Navigate to="/legal/admin/codesets" replace />;
}
