import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KV, dt, TabLoading, TabErrorState, TabEmptyState } from '../components';
import { useAwardProduct } from '../useAward360Queries';

export const AwardProductTab: React.FC<{ awardId: string }> = ({ awardId }) => {
  const { data, isLoading, error, refetch } = useAwardProduct(awardId);
  if (isLoading) return <TabLoading />;
  if (error) return <TabErrorState error={error} onRetry={() => refetch()} />;
  if (!data) return <TabEmptyState title="No product linked" />;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Product & version</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
          <KV label="Product code" value={data.productCode} />
          <KV label="Product name" value={data.productName} />
          <KV label="Scheme" value={data.scheme} />
          <KV label="Branch" value={data.branch} />
          <KV label="Category" value={data.category} />
          <KV label="Payment type" value={data.paymentType} />
          <KV label="Product status" value={data.status} />
          <KV label="Version" value={data.versionNumber} />
          <KV label="Version status" value={data.versionStatus} />
          <KV label="Effective from" value={dt(data.effectiveFrom)} />
          <KV label="Effective to" value={dt(data.effectiveTo)} />
          <KV label="Country" value={data.country} />
          <KV label="Duration type" value={data.benefitDurationType} />
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild size="sm" variant="outline"><a href="/bn/products">Open Product Catalog</a></Button>
          {data.versionId ? (
            <Button asChild size="sm" variant="outline"><a href={`/bn/products/versions/${data.versionId}`}>Open Version</a></Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">This tab is read-only in Award 360. Configuration changes are made in the Product workspace.</p>
      </CardContent>
    </Card>
  );
};
