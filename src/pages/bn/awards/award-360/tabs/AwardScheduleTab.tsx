import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TabLoading, TabErrorState, AwardMoney, AwardStatusBadge, dt } from '../components';
import { SimpleTable } from '../components/SimpleTable';
import { useAwardSchedules } from '../useAward360Queries';

export const AwardScheduleTab: React.FC<{ awardId: string }> = ({ awardId }) => {
  const { data = [], isLoading, error, refetch } = useAwardSchedules(awardId);
  if (isLoading) return <TabLoading />;
  if (error) return <TabErrorState error={error} onRetry={() => refetch()} />;
  const paid = data.filter((s) => s.status === 'PAID').length;
  const pending = data.filter((s) => s.status === 'PENDING' || s.status === 'DUE').length;
  const held = data.filter((s) => s.status === 'HOLD').length;
  const nextDue = data.find((s) => s.status !== 'PAID' && s.dueDate);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Payment schedule</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-4 text-xs">
          <span>Total: <strong>{data.length}</strong></span>
          <span>Paid: <strong>{paid}</strong></span>
          <span>Pending: <strong>{pending}</strong></span>
          <span>Held: <strong>{held}</strong></span>
          <span>Next due: <strong>{dt(nextDue?.dueDate)}</strong></span>
        </div>
        <SimpleTable
          rows={data}
          empty="No schedule rows for this award."
          columns={[
            { key: 'schedulePeriod', label: 'Period' },
            { key: 'dueDate', label: 'Due', render: (r) => dt(r.dueDate) },
            { key: 'grossAmount', label: 'Gross', align: 'right', render: (r) => <AwardMoney value={r.grossAmount} /> },
            { key: 'deductions', label: 'Deductions', align: 'right', render: (r) => <AwardMoney value={r.deductions} /> },
            { key: 'netAmount', label: 'Net', align: 'right', render: (r) => <AwardMoney value={r.netAmount} /> },
            { key: 'status', label: 'Status', render: (r) => <AwardStatusBadge status={r.status} /> },
            { key: 'paymentMethod', label: 'Method' },
            { key: 'paymentRef', label: 'Reference' },
            { key: 'paidAt', label: 'Paid', render: (r) => dt(r.paidAt) },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline"><a href={`/bn/schedules?awardId=${awardId}`}>Open Payment Schedule</a></Button>
          <Button asChild size="sm" variant="outline"><a href={`/bn/payables?awardId=${awardId}`}>Open Payables</a></Button>
        </div>
      </CardContent>
    </Card>
  );
};
