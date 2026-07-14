import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TabLoading, TabErrorState, AwardStatusBadge, dt } from '../components';
import { SimpleTable } from '../components/SimpleTable';
import { useAwardSuspensions } from '../useAward360Queries';

export const AwardSuspensionsTab: React.FC<{ awardId: string }> = ({ awardId }) => {
  const { data = [], isLoading, error, refetch } = useAwardSuspensions(awardId);
  if (isLoading) return <TabLoading />;
  if (error) return <TabErrorState error={error} onRetry={() => refetch()} />;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Award suspensions</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <SimpleTable
          rows={data}
          empty="No suspension events for this award."
          columns={[
            { key: 'id', label: 'Request', render: (r) => (r.id ? String(r.id).slice(0, 8) : '—') },
            { key: 'displayStatus', label: 'Status', render: (r) => <AwardStatusBadge status={r.displayStatus} tone={r.displayStatus?.startsWith('PENDING') ? 'warn' : 'default'} /> },
            { key: 'eventStatus', label: 'Event' },
            { key: 'suspensionType', label: 'Type' },
            { key: 'requestedEffectiveDate', label: 'Requested', render: (r) => dt(r.requestedEffectiveDate) },
            { key: 'actualEffectiveDate', label: 'Effective', render: (r) => dt(r.actualEffectiveDate) },
            { key: 'endDate', label: 'End', render: (r) => dt(r.endDate) },
            { key: 'reasonCode', label: 'Reason' },
            { key: 'currentApprovalLevel', label: 'Level' },
            { key: 'workbasketCode', label: 'Workbasket' },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline"><a href={`/bn/award-suspension?awardId=${awardId}`}>Open Award Suspension workspace</a></Button>
          <Button size="sm" variant="outline" disabled title="Propose/approve controls are governed by app_modules.actions_enabled and are currently disabled.">Propose</Button>
          <Button size="sm" variant="outline" disabled title="Propose/approve controls are governed by app_modules.actions_enabled and are currently disabled.">Review approval</Button>
        </div>
      </CardContent>
    </Card>
  );
};
