import { Undo2 } from 'lucide-react';
import CaseRequestsQueue from './CaseRequestsQueue';

const ReopenRequestsPage = () => (
  <CaseRequestsQueue
    title="Reopen Requests"
    description="Review requests to reopen previously closed cases"
    icon={Undo2}
    type="REOPEN"
    featureKey="cases.reopenRequests"
  />
);

export default ReopenRequestsPage;
