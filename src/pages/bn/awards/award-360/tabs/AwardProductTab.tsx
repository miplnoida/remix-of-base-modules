/**
 * BN-AWARD360-B3D — Product deep view.
 * Read-only. Uses /bn/config/products (not /bn/products).
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KV, dt, TabLoading, TabErrorState, TabEmptyState } from '../components';
import {
  Award360HealthGrid,
  Award360WarningList,
  Award360ReadinessMatrix,
  Award360RestrictedNotice,
} from '../components/Award360DeepPrimitives';
import { useAwardProductDeep } from '../useAward360DeepQueries';
import type { ProductAccess } from '@/services/bn/awards/award360DeepService';

export interface AwardProductTabProps {
  awardId: string;
  access: ProductAccess;
  enabled?: boolean;
}

export const AwardProductTab: React.FC<AwardProductTabProps> = ({ awardId, access, enabled = true }) => {
  const { data, isLoading, error, refetch } = useAwardProductDeep(awardId, access, enabled);
  if (isLoading) return <TabLoading />;
  if (error) return <TabErrorState error={error} onRetry={() => refetch()} />;
  if (!data) return <TabEmptyState title="No product linked" />;
  const { identity, version, readiness, routes, warnings, partialWarnings, restrictedConfiguration } = data;

  return (
    <div className="space-y-4">
      <Award360WarningList warnings={warnings} partialWarnings={partialWarnings} />

      <Card>
        <CardHeader><CardTitle className="text-base">Product</CardTitle></CardHeader>
        <CardContent>
          <Award360HealthGrid
            columns={3}
            items={[
              { label: 'Code', value: identity.productCode },
              { label: 'Name', value: identity.productName },
              { label: 'Benefit code', value: identity.benefitCode },
              { label: 'Scheme', value: identity.scheme },
              { label: 'Branch', value: identity.branch },
              { label: 'Category', value: identity.category },
              { label: 'Payment type', value: identity.paymentType },
              { label: 'Country', value: identity.country },
              { label: 'Status', value: identity.status },
              { label: 'Legal reference', value: identity.legalReference },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Version</CardTitle></CardHeader>
        <CardContent>
          {!version.present ? (
            <TabEmptyState title="No product version resolved" />
          ) : (
            <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
              <KV label="Version ID" value={version.versionId} />
              <KV label="Version number" value={version.versionNumber} />
              <KV label="Status" value={version.status} />
              <KV label="Published" value={version.published ? 'Yes' : 'No'} />
              <KV label="Effective from" value={dt(version.effectiveFrom)} />
              <KV label="Effective to" value={dt(version.effectiveTo)} />
              <KV label="Created by" value={version.createdBy} />
              <KV label="Created at" value={dt(version.createdAt)} />
              <KV label="Product ↔ Award match" value={version.productMatchesAward ? 'Match' : 'MISMATCH'} />
              <KV label="Award inside effective range" value={version.awardWithinEffective == null ? '—' : version.awardWithinEffective ? 'Yes' : 'No'} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Configuration readiness</CardTitle></CardHeader>
        <CardContent>
          {restrictedConfiguration ? (
            <Award360RestrictedNotice message="Product configuration is not available under current access." />
          ) : (
            <Award360ReadinessMatrix items={readiness} />
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline"><a href={routes.catalog} data-testid="product-catalog-link">Open Product Catalog</a></Button>
        <Button asChild size="sm" variant="outline"><a href={routes.formulas} data-testid="product-formulas-link">Open Formulas</a></Button>
        <Button asChild size="sm" variant="outline"><a href={routes.documentSetup} data-testid="product-doc-setup-link">Document setup</a></Button>
        <Button asChild size="sm" variant="outline"><a href={routes.screenSetup} data-testid="product-screen-setup-link">Screen setup</a></Button>
      </div>
      <p className="text-xs text-muted-foreground">Award 360 is read-only for Product configuration. Changes are made in the Product workspace.</p>
    </div>
  );
};
