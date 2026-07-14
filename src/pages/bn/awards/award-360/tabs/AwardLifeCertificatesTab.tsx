import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TabLoading, TabErrorState, AwardStatusBadge, dt } from '../components';
import { SimpleTable } from '../components/SimpleTable';
import { useAwardLifeCertificates } from '../useAward360Queries';

export const AwardLifeCertificatesTab: React.FC<{ awardId: string }> = ({ awardId }) => {
  const { data = [], isLoading, error, refetch } = useAwardLifeCertificates(awardId);
  if (isLoading) return <TabLoading />;
  if (error) return <TabErrorState error={error} onRetry={() => refetch()} />;
  const overdue = data.filter((r) => r.daysOverdue > 0).length;
  const verified = data.filter((r) => r.status === 'VERIFIED').length;
  const nextDue = data.find((r) => r.dueDate && r.status !== 'VERIFIED');
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Life certificates</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-4 text-xs">
          <span>Total: <strong>{data.length}</strong></span>
          <span>Verified: <strong>{verified}</strong></span>
          <span>Overdue: <strong className={overdue ? 'text-destructive' : ''}>{overdue}</strong></span>
          <span>Next due: <strong>{dt(nextDue?.dueDate)}</strong></span>
        </div>
        <SimpleTable
          rows={data}
          empty="No life certificate records."
          columns={[
            { key: 'requiredPeriod', label: 'Period' },
            { key: 'dueDate', label: 'Due', render: (r) => dt(r.dueDate) },
            { key: 'submittedDate', label: 'Submitted', render: (r) => dt(r.submittedDate) },
            { key: 'verifiedDate', label: 'Verified', render: (r) => dt(r.verifiedDate) },
            { key: 'verificationMethod', label: 'Method' },
            { key: 'status', label: 'Status', render: (r) => <AwardStatusBadge status={r.status} tone={r.daysOverdue > 0 ? 'breach' : 'default'} /> },
            { key: 'daysOverdue', label: 'Overdue', align: 'right', render: (r) => (r.daysOverdue ? `${r.daysOverdue}d` : '—') },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline"><a href={`/bn/life-certificates?awardId=${awardId}`}>Open Life Certificate Management</a></Button>
          <Button size="sm" variant="outline" disabled title="No server-authorised verify command is enabled; use the Life Certificate workspace">Verify</Button>
          <Button size="sm" variant="outline" disabled title="Reminders are dispatched via Communication Hub; direct trigger is not enabled">Send reminder</Button>
        </div>
      </CardContent>
    </Card>
  );
};
