import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { FlaskConical } from 'lucide-react';

export default function SamplingDashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Sampling Dashboard"
        subtitle="Manager overview of sampling runs and audit candidate selection"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Audit Planning', href: '/compliance/audit-planning' },
          { label: 'Sampling Dashboard' },
        ]}
      />
      <Card>
        <CardContent className="py-20 text-center text-muted-foreground">
          <FlaskConical className="h-14 w-14 mx-auto mb-4 opacity-40" />
          <p className="font-semibold text-foreground text-lg">Sampling Engine Not Yet Provisioned</p>
          <p className="text-sm mt-2 max-w-md mx-auto">
            Audit sampling batches and selection runs will appear here once the sampling
            infrastructure (batches, candidates, settings) is configured for this environment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
