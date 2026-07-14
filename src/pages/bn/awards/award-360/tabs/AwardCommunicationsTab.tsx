import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TabLoading, TabErrorState, AwardStatusBadge, dt } from '../components';
import { SimpleTable } from '../components/SimpleTable';
import { useAwardCommunications } from '../useAward360Queries';

export const AwardCommunicationsTab: React.FC<{ awardId: string }> = ({ awardId }) => {
  const { data = [], isLoading, error, refetch } = useAwardCommunications(awardId);
  if (isLoading) return <TabLoading />;
  if (error) return <TabErrorState error={error} onRetry={() => refetch()} />;
  const failed = data.filter((c) => c.status === 'FAILED').length;
  const queued = data.filter((c) => c.status === 'QUEUED' || c.status === 'PENDING').length;
  const sent = data.filter((c) => c.status === 'SENT' || c.status === 'DELIVERED').length;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Communications</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-4 text-xs">
          <span>Total: <strong>{data.length}</strong></span>
          <span>Sent/Delivered: <strong>{sent}</strong></span>
          <span>Queued: <strong>{queued}</strong></span>
          <span>Failed: <strong className={failed ? 'text-destructive' : ''}>{failed}</strong></span>
        </div>
        <SimpleTable
          rows={data}
          empty="No communications recorded for this award."
          columns={[
            { key: 'createdAt', label: 'Date', render: (r) => dt(r.createdAt) },
            { key: 'eventCode', label: 'Event' },
            { key: 'channel', label: 'Channel' },
            { key: 'recipientType', label: 'Recipient type' },
            { key: 'recipientAddressMasked', label: 'Recipient' },
            { key: 'templateId', label: 'Template' },
            { key: 'subject', label: 'Subject' },
            { key: 'status', label: 'Status', render: (r) => <AwardStatusBadge status={r.status} tone={r.status === 'FAILED' ? 'breach' : r.status === 'PENDING' ? 'warn' : 'default'} /> },
            { key: 'retryCount', label: 'Retries', align: 'right' },
            { key: 'providerMessageId', label: 'Provider ref' },
          ]}
        />
        <p className="text-xs text-muted-foreground">All sends and retries go through the Communication Hub façade. Direct writes to bn_communication_log / bn_letter / notification_queue are disabled.</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline"><a href="/admin/communication-hub">Open Communication Hub</a></Button>
          <Button asChild size="sm" variant="outline"><a href="/admin/communication-hub/retry-queue">Retry queue</a></Button>
          <Button asChild size="sm" variant="outline"><a href="/admin/communication-hub/delivery-monitor">Delivery monitor</a></Button>
        </div>
      </CardContent>
    </Card>
  );
};
