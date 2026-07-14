import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabLoading, TabErrorState, AwardMoney, AwardStatusBadge, dt } from '../components';
import { SimpleTable } from '../components/SimpleTable';
import { useAwardPayments } from '../useAward360Queries';

export const AwardPaymentsTab: React.FC<{ awardId: string }> = ({ awardId }) => {
  const { data = [], isLoading, error, refetch } = useAwardPayments(awardId);
  if (isLoading) return <TabLoading />;
  if (error) return <TabErrorState error={error} onRetry={() => refetch()} />;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Payment history</CardTitle></CardHeader>
      <CardContent>
        <SimpleTable
          rows={data}
          empty="No payment instructions issued for this award."
          columns={[
            { key: 'reference', label: 'Reference' },
            { key: 'dueDate', label: 'Due', render: (r) => dt(r.dueDate) },
            { key: 'amount', label: 'Amount', align: 'right', render: (r) => <AwardMoney value={r.amount} currency={r.currency} /> },
            { key: 'paymentMethod', label: 'Method' },
            { key: 'accountMasked', label: 'Account' },
            { key: 'status', label: 'Status', render: (r) => <AwardStatusBadge status={r.status} tone={r.status === 'FAILED' ? 'breach' : r.status === 'HOLD' ? 'warn' : 'default'} /> },
            { key: 'paidDate', label: 'Paid', render: (r) => dt(r.paidDate) },
            { key: 'cancelReason', label: 'Cancel reason' },
          ]}
        />
      </CardContent>
    </Card>
  );
};
