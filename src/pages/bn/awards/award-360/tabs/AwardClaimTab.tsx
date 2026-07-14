import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KV, dt, TabLoading, TabErrorState, TabEmptyState } from '../components';
import { useAwardClaim } from '../useAward360Queries';

export const AwardClaimTab: React.FC<{ awardId: string }> = ({ awardId }) => {
  const { data, isLoading, error, refetch } = useAwardClaim(awardId);
  if (isLoading) return <TabLoading />;
  if (error) return <TabErrorState error={error} onRetry={() => refetch()} />;
  if (!data) return <TabEmptyState title="No claim linked" hint="This award has no bn_claim_id link." />;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Original claim</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
          <KV label="Claim number" value={data.claimNumber} />
          <KV label="Status" value={data.status} />
          <KV label="Submission date" value={dt(data.submissionDate)} />
          <KV label="Claim date" value={dt(data.claimDate)} />
          <KV label="Channel" value={data.applicationChannel} />
          <KV label="Priority" value={data.priority} />
          <KV label="Assigned officer" value={data.assignedOfficer} />
          <KV label="Eligibility" value={data.eligibilityResult} />
          <KV label="Calculation" value={data.calculationResult} />
          <KV label="Decision" value={data.decisionStatus} />
          <KV label="Approval" value={data.approvalStatus} />
          <KV label="Award created" value={dt(data.awardCreationDate)} />
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild size="sm" variant="default"><a href={data.workbenchRoute!} data-testid="claim-workbench-link">Open Claim Workbench</a></Button>
          <Button asChild size="sm" variant="outline"><a href={`${data.workbenchRoute}?section=eligibility`}>Eligibility</a></Button>
          <Button asChild size="sm" variant="outline"><a href={`${data.workbenchRoute}?section=calculation`}>Calculation</a></Button>
          <Button asChild size="sm" variant="outline"><a href={`${data.workbenchRoute}?section=decision`}>Determination</a></Button>
        </div>
      </CardContent>
    </Card>
  );
};
