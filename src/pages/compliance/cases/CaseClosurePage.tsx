import { Lock } from 'lucide-react';
import CaseRequestsQueue from './CaseRequestsQueue';

const CaseClosurePage = () => (
  <CaseRequestsQueue
    title="Case Closure"
    description="Review and approve case closure requests"
    icon={Lock}
    type="CLOSURE"
    featureKey="cases.closure"
  />
);

export default CaseClosurePage;
