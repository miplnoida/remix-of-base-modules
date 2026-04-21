import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function RiskSamplingSettings() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Risk & Sampling Policy Settings"
        subtitle="Configure random and risk-based audit selection policies"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Admin Settings', href: '/compliance/admin/settings' },
          { label: 'Risk & Sampling' },
        ]}
      />
      <Card>
        <CardContent className="py-20 text-center text-muted-foreground">
          <Settings className="h-14 w-14 mx-auto mb-4 opacity-40" />
          <p className="font-semibold text-foreground text-lg">Sampling Settings Not Yet Provisioned</p>
          <p className="text-sm mt-2 max-w-md mx-auto">
            Risk weighting, mandatory rules, and sampling execution policies will be
            configurable here once the sampling settings store is enabled for this environment.
            In the interim, configure risk policies under <span className="font-medium text-foreground">Compliance → Admin → Risk Policies</span>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
