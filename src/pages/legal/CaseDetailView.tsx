import { Navigate, useParams } from 'react-router-dom';

/**
 * Legacy Legal Case Detail route.
 *
 * The central enterprise Legal Case workspace now lives at
 * `/legal/lg/cases/:id` (see `src/pages/legal/LgCaseDetail.tsx`), which is
 * wired to real `lg_case*` tables, capability gating (`useLgAccess`,
 * `useLegalReadOnly`), audit logging (`logLgActivity`), and every requested
 * tab (Overview, Parties, Source / Referral, Hearings, Tasks, Notices,
 * Letters, Documents, Orders / Judgments, Payments / Recovery,
 * Settlements, Activity / Audit, Timeline) plus every requested action
 * (Edit, Assign / Reassign officer, Update stage, Add hearing, Add task,
 * Generate notice, Upload / link document, Add order, Add settlement,
 * Link payment arrangement, Close case).
 *
 * This shim keeps any deep links to the old mock screen working by
 * forwarding them to the real workspace.
 */
const CaseDetailView = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/legal/lg/cases/${id ?? ''}`} replace />;
};

export default CaseDetailView;
