import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TabLoading, TabErrorState, AwardStatusBadge, dt } from '../components';
import { SimpleTable } from '../components/SimpleTable';
import { useAwardMedicalReviews } from '../useAward360Queries';

export const AwardMedicalReviewsTab: React.FC<{ awardId: string; canViewSensitive: boolean }> = ({ awardId, canViewSensitive }) => {
  const { data = [], isLoading, error, refetch } = useAwardMedicalReviews(awardId, canViewSensitive);
  if (!canViewSensitive) {
    return <div className="rounded-md border p-6 text-sm text-muted-foreground">You do not have permission to view medical review data.</div>;
  }
  if (isLoading) return <TabLoading />;
  if (error) return <TabErrorState error={error} onRetry={() => refetch()} />;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Medical reviews</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <SimpleTable
          rows={data}
          empty="No medical reviews scheduled."
          columns={[
            { key: 'reviewType', label: 'Type' },
            { key: 'scheduledDate', label: 'Scheduled', render: (r) => dt(r.scheduledDate) },
            { key: 'provider', label: 'Provider' },
            { key: 'status', label: 'Status', render: (r) => <AwardStatusBadge status={r.status} /> },
            { key: 'completedDate', label: 'Completed', render: (r) => dt(r.completedDate) },
            { key: 'outcome', label: 'Outcome' },
            { key: 'nextReviewDate', label: 'Next review', render: (r) => dt(r.nextReviewDate) },
          ]}
        />
        <Button asChild size="sm" variant="outline"><a href="/bn/servicing/medical-reviews">Open Medical Review Scheduler</a></Button>
      </CardContent>
    </Card>
  );
};
