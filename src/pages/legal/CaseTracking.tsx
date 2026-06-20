/**
 * CaseTracking — routed at /legal/cases and /legal/case-tracking.
 *
 * Previously rendered a hand-rolled <Table>. To keep the Legal module
 * aligned with the Benefits grid framework (LgDataGrid → BNDataGrid),
 * this screen now reuses the standardized LgCaseList implementation so
 * pagination, sorting, filtering, column picker, export, bulk actions
 * and row actions behave identically across both routes.
 */
import LgCaseList from "./LgCaseList";

const CaseTracking = () => <LgCaseList />;

export default CaseTracking;
