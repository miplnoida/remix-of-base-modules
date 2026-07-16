/**
 * BN-AWARD360-B3D — Claim deep view.
 * Read-only. No mutation imports. Uses /bn/claims/:id/{section} paths (no ?section= query).
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KV, dt, TabLoading, TabErrorState, TabEmptyState } from '../components';
import {
  Award360HealthGrid,
  Award360WarningList,
  Award360Timeline,
  Award360RestrictedNotice,
} from '../components/Award360DeepPrimitives';
import { useAwardClaimDeep } from '../useAward360DeepQueries';
import type { ClaimAccess } from '@/services/bn/awards/award360DeepService';

export interface AwardClaimTabProps {
  awardId: string;
  access: ClaimAccess;
  enabled?: boolean;
}

export const AwardClaimTab: React.FC<AwardClaimTabProps> = ({ awardId, access, enabled = true }) => {
  const { data, isLoading, error, refetch } = useAwardClaimDeep(awardId, access, enabled);
  if (isLoading) return <TabLoading />;
  if (error) return <TabErrorState error={error} onRetry={() => refetch()} />;
  if (!data) return <TabEmptyState title="No claim linked" hint="This award has no bn_claim_id link." />;
  const { header, eligibility, evidence, calculation, decision, timeline, workflowRestricted, routes, warnings, partialWarnings } = data;

  return (
    <div className="space-y-4">
      <Award360WarningList warnings={warnings} partialWarnings={partialWarnings} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Claim header
            {header.slaBreached ? <Badge variant="destructive">SLA breached</Badge> : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Award360HealthGrid
            columns={3}
            items={[
              { label: 'Claim ID', value: header.claimId },
              { label: 'Claim number', value: header.claimNumber },
              { label: 'Status', value: header.status },
              { label: 'Priority', value: header.priority },
              { label: 'Channel', value: header.applicationChannel },
              { label: 'Claim date', value: dt(header.claimDate) },
              { label: 'Submission date', value: dt(header.submissionDate) },
              { label: 'Product version', value: header.productVersionLabel ?? header.productVersionId },
              { label: 'Assigned officer', value: header.assignedOfficer },
              { label: 'Workbasket', value: header.workbasket },
              { label: 'Current task', value: header.currentTask },
              { label: 'SLA due', value: dt(header.slaDueAt), tone: header.slaBreached ? 'breach' : undefined },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Eligibility</CardTitle></CardHeader>
        <CardContent>
          {!eligibility.present ? (
            <TabEmptyState title="Eligibility not yet evaluated" />
          ) : (
            <>
              <Award360HealthGrid
                columns={4}
                items={[
                  { label: 'Latest result', value: eligibility.latestResult,
                    tone: eligibility.latestResult === 'PASS' ? 'ok' : 'warn' },
                  { label: 'Checked at', value: dt(eligibility.checkedAt) },
                  { label: 'Passed rules', value: eligibility.passedCount },
                  { label: 'Failed rules', value: eligibility.failedCount,
                    tone: eligibility.failedCount > 0 ? 'warn' : 'ok' },
                  { label: 'Warnings', value: eligibility.warningCount },
                  { label: 'Override actor', value: eligibility.overrideActor },
                  { label: 'Override reason', value: eligibility.overrideReason },
                ]}
              />
              {eligibility.failedRules.length > 0 && (
                <div className="mt-3 rounded-md border">
                  <div className="border-b bg-muted/40 px-3 py-2 text-xs font-medium">Failed rules</div>
                  <ul className="divide-y">
                    {eligibility.failedRules.map((r, i) => (
                      <li key={i} data-testid={`elig-failed-${r.code}`} className="px-3 py-2 text-sm">
                        <div className="font-medium">{r.name} <span className="text-xs text-muted-foreground">({r.code})</span></div>
                        {r.message ? <div className="text-xs text-muted-foreground">{r.message}</div> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Evidence</CardTitle></CardHeader>
        <CardContent>
          {evidence.restricted ? (
            <Award360RestrictedNotice message="Evidence is not available under current access." />
          ) : !evidence.present ? (
            <TabEmptyState title="No evidence recorded" />
          ) : (
            <>
              <Award360HealthGrid
                columns={5}
                items={[
                  { label: 'Required', value: evidence.required },
                  { label: 'Received', value: evidence.received },
                  { label: 'Verified', value: evidence.verified, tone: 'ok' },
                  { label: 'Missing', value: evidence.missing, tone: evidence.missing > 0 ? 'warn' : 'ok' },
                  { label: 'Waived', value: evidence.waived },
                ]}
              />
              {evidence.blocking.length > 0 && (
                <div className="mt-3 rounded-md border">
                  <div className="border-b bg-destructive/10 px-3 py-2 text-xs font-medium">Blocking evidence</div>
                  <ul className="divide-y">
                    {evidence.blocking.map((b, i) => (
                      <li key={i} data-testid={`evidence-blocking-${i}`} className="px-3 py-2 text-sm">
                        <div className="font-medium">{b.name} <Badge variant="outline" className="ml-2 text-[10px]">{b.status}</Badge></div>
                        {b.reason ? <div className="text-xs text-muted-foreground">{b.reason}</div> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Calculation</CardTitle></CardHeader>
        <CardContent>
          {!calculation.present ? (
            <TabEmptyState title="No calculation run" />
          ) : (
            <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
              <KV label="Calc ID" value={calculation.calcId} />
              <KV label="Version" value={calculation.version} />
              <KV label="Weekly rate" value={calculation.weeklyRate ?? '—'} />
              <KV label="Monthly rate" value={calculation.monthlyRate ?? '—'} />
              <KV label="Lump sum" value={calculation.lumpSum ?? '—'} />
              <KV label="Effective date" value={dt(calculation.effectiveDate)} />
              <KV label="Status" value={calculation.status} />
              <KV label="Override state" value={calculation.overrideState} />
              <KV label="Trace" value={calculation.traceSummary} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recommendation &amp; decision</CardTitle></CardHeader>
        <CardContent>
          {!decision.present ? (
            <TabEmptyState title="No decision recorded" />
          ) : (
            <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
              <KV label="Recommendation" value={decision.recommendation} />
              <KV label="Decision" value={decision.decision} />
              <KV label="Reason" value={decision.decisionReason} />
              <KV label="Narrative" value={decision.narrative} />
              <KV label="Decided by" value={decision.decidedBy} />
              <KV label="Decided at" value={dt(decision.decidedAt)} />
              <KV label="Approval status" value={decision.approvalStatus} />
              <KV label="Approval level" value={decision.approvalLevel} />
              <KV label="Policy / workflow ref" value={decision.policyReference} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
        <CardContent>
          <Award360Timeline events={timeline.map((t) => ({ ...t }))} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm"><a href={routes.workbench} data-testid="claim-workbench-link">Open Claim Workbench</a></Button>
        <Button asChild size="sm" variant="outline"><a href={routes.eligibility} data-testid="claim-eligibility-link">Eligibility</a></Button>
        <Button asChild size="sm" variant="outline"><a href={routes.calculation} data-testid="claim-calculation-link">Calculation</a></Button>
        <Button asChild size="sm" variant="outline"><a href={routes.recommendation} data-testid="claim-recommendation-link">Recommendation</a></Button>
        <Button asChild size="sm" variant="outline"><a href={routes.determination} data-testid="claim-determination-link">Determination</a></Button>
      </div>
    </div>
  );
};
