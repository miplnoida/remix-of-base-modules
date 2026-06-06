import type { ReactNode } from 'react';
import { usePortalFeatureConfig } from '@/hooks/external/usePortalFeatureConfig';
import type { FeatureKey } from '@/services/external/portalFeatureConfigService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface Props {
  feature: FeatureKey;
  title?: string;
  description?: string;
  children: ReactNode;
}

export function RequireFeature({ feature, title, description, children }: Props) {
  const { data, isLoading } = usePortalFeatureConfig();
  if (isLoading) return null;
  if (data && data[feature]) return <>{children}</>;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title ?? 'Feature unavailable'}</CardTitle>
        <CardDescription>
          {description ?? 'This feature has been disabled by the administrator.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        If you believe this is a mistake, please contact Social Security support.
      </CardContent>
    </Card>
  );
}
