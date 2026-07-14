import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TabLoading, TabErrorState, AwardMoney, AwardStatusBadge, dt } from '../components';
import { SimpleTable } from '../components/SimpleTable';
import { useAwardOverpayments } from '../useAward360Queries';

export const AwardOverpaymentsTab: React.FC<{ awardId: string }> = ({ awardId }) => {
  const { data = [], isLoading, error, refetch } = useAwardOverpayments(awardId);
  if (isLoading) return <TabLoading />;
  if (error) return <TabErrorState error={error} onRetry={() => refetch()} />;
  const outstanding = data.reduce((s, o) => s + (o.outstandingAmount ?? 0), 0);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Overpayments</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs">Outstanding balance: <strong className={outstanding > 0 ? 'text-destructive' : ''}><AwardMoney value={outstanding} /></strong></div>
        <SimpleTable
          rows={data}
          empty="No overpayments recorded."
          columns={[
            { key: 'reference', label: 'Reference' },
            { key: 'detectedDate', label: 'Detected', render: (r) => dt(r.detectedDate) },
            { key: 'periodFrom', label: 'Period from', render: (r) => dt(r.periodFrom) },
            { key: 'periodTo', label: 'Period to', render: (r) => dt(r.periodTo) },
            { key: 'originalAmount', label: 'Original', align: 'right', render: (r) => <AwardMoney value={r.originalAmount} /> },
            { key: 'recoveredAmount', label: 'Recovered', align: 'right', render: (r) => <AwardMoney value={r.recoveredAmount} /> },
            { key: 'outstandingAmount', label: 'Outstanding', align: 'right', render: (r) => <AwardMoney value={r.outstandingAmount} /> },
            { key: 'recoveryMethod', label: 'Method' },
            { key: 'recoveryStatus', label: 'Status', render: (r) => <AwardStatusBadge status={r.recoveryStatus} /> },
            { key: 'reasonCode', label: 'Reason' },
          ]}
        />
        <Button asChild size="sm" variant="outline"><a href={`/bn/overpayments?awardId=${awardId}`}>Open Overpayment Recovery</a></Button>
      </CardContent>
    </Card>
  );
};
