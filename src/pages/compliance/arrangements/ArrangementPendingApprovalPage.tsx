import ArrangementListPage from './ArrangementListPage';
export default function ArrangementPendingApprovalPage() {
  return <ArrangementListPage title="Pending Approval" subtitle="Arrangements awaiting approval before activation."
    statuses={['PENDING_APPROVAL']} showApprovalActions featureKey="arrangements.pendingApproval" />;
}
