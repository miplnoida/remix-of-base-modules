import { GitMerge } from 'lucide-react';
import CaseRequestsQueue from './CaseRequestsQueue';

const CaseMergeReviewPage = () => (
  <CaseRequestsQueue
    title="Case Merge Review"
    description="Review and approve requests to merge cases"
    icon={GitMerge}
    type="MERGE"
    featureKey="cases.mergeReview"
  />
);

export default CaseMergeReviewPage;
