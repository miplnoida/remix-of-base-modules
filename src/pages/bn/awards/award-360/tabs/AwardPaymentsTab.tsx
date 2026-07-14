import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TabLoading, TabErrorState, AwardMoney, AwardStatusBadge, dt } from '../components';
import { SimpleTable } from '../components/SimpleTable';
import { useAwardPayments } from '../useAward360Queries';

export const AwardPaymentsTab: React.FC<{ awardId: string }> = ({ awardId }) => {
  const { data = [], isLoading, error, refetch } = useAwardPayments(awardId);
  if (isLoading) return <TabLoading />;
  if (error) return <TabErrorState error={error} onRetry={() => refetch()} />;
  const total = data.length;
  const paid = data.filter((p) => p.status === 'PAID' || p.status === 'ISSUED').length;
  const failed = data.filter((p) => p.status === 'FAILED' || p.status === 'REJECTED').length;
  const held = data.filter((p) => p.status === 'HOLD' || p.status === 'ON_HOLD').length;
  const cancelled = data.filter((p) => p.status === 'CANCELLED').length;
  const totalAmount = data.reduce((s, p) => s + (p.amount ?? 0), 0);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Payment history</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-4 text-xs">
          <span>Total: <strong>{total}</strong></span>
          <span>Total amount: <strong><AwardMoney value={totalAmount} /></strong></span>
          <span>Paid/Issued: <strong>{paid}</strong></span>
          <span>Held: <strong className={held ? 'text-yellow-600' : ''}>{held}</strong></span>
          <span>Failed: <strong className={failed ? 'text-destructive' : ''}>{failed}</strong></span>
          <span>Cancelled: <strong>{cancelled}</strong></span>
        </div>
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
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline"><a href={`/bn/payables?awardId=${awardId}`}>Open Payables</a></Button>
          <Button asChild size="sm" variant="outline"><a href="/bn/batches">Open Batches</a></Button>
          <Button asChild size="sm" variant="outline"><a href="/bn/issue">Payment Issue</a></Button>
          <Button asChild size="sm" variant="outline"><a href="/bn/post-issue">Post-Issue Review</a></Button>
          <Button asChild size="sm" variant="outline"><a href="/bn/exceptions">Exceptions</a></Button>
          <Button asChild size="sm" variant="outline"><a href={`/bn/payment-history?awardId=${awardId}`}>Payment History</a></Button>
        </div>
      </CardContent>
    </Card>
  );
};
