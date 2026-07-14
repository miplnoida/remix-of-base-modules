import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabLoading, TabErrorState, AwardMoney, AwardStatusBadge, dt } from '../components';
import { SimpleTable } from '../components/SimpleTable';
import { useAwardBeneficiaries } from '../useAward360Queries';

export const AwardBeneficiariesTab: React.FC<{ awardId: string }> = ({ awardId }) => {
  const { data = [], isLoading, error, refetch } = useAwardBeneficiaries(awardId);
  if (isLoading) return <TabLoading />;
  if (error) return <TabErrorState error={error} onRetry={() => refetch()} />;
  const active = data.filter((b) => b.status === 'ACTIVE');
  const totalShare = active.reduce((s, b) => s + Number(b.sharePercent ?? 0), 0);
  const totalAmount = active.reduce((s, b) => s + Number(b.shareAmount ?? 0), 0);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Beneficiaries</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-4 text-xs">
          <span>Active: <strong>{active.length}</strong></span>
          <span>Total share: <strong className={Math.abs(totalShare - 100) > 0.01 && active.length ? 'text-destructive' : ''}>{totalShare.toFixed(2)}%</strong></span>
          <span>Total amount: <strong><AwardMoney value={totalAmount} /></strong></span>
        </div>
        <SimpleTable
          rows={data}
          empty="No beneficiaries on this award."
          columns={[
            { key: 'fullName', label: 'Name' },
            { key: 'ssnMasked', label: 'SSN' },
            { key: 'relationship', label: 'Relationship' },
            { key: 'sharePercent', label: 'Share %', align: 'right', render: (r) => r.sharePercent != null ? `${r.sharePercent}%` : '—' },
            { key: 'shareAmount', label: 'Amount', align: 'right', render: (r) => <AwardMoney value={r.shareAmount} /> },
            { key: 'startDate', label: 'Start', render: (r) => dt(r.startDate) },
            { key: 'endDate', label: 'End', render: (r) => dt(r.endDate) },
            { key: 'status', label: 'Status', render: (r) => <AwardStatusBadge status={r.status} /> },
            { key: 'bankAccountMasked', label: 'Account' },
          ]}
        />
        <p className="text-xs text-muted-foreground">
          Beneficiary amendments are performed in the Survivors Processing workspace. Direct edits are disabled.
        </p>
      </CardContent>
    </Card>
  );
};
