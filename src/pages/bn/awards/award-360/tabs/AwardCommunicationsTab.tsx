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
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Communications</CardTitle></CardHeader>
      <CardContent className="space-y-3">
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
        <p className="text-xs text-muted-foreground">All sends and retries go through the Communication Hub. Direct inserts are disabled.</p>
        <Button asChild size="sm" variant="outline"><a href="/communication-hub">Open Communication Hub</a></Button>
      </CardContent>
    </Card>
  );
};
