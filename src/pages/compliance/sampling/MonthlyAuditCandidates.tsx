import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function MonthlyAuditCandidates() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Monthly Audit Candidates"
        subtitle="Supervisor planning screen for next month's audit selections"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Audit Planning', href: '/compliance/audit-planning' },
          { label: 'Monthly Candidates' },
        ]}
      />
      <Card>
        <CardContent className="py-20 text-center text-muted-foreground">
          <Users className="h-14 w-14 mx-auto mb-4 opacity-40" />
          <p className="font-semibold text-foreground text-lg">Audit Candidates Not Yet Available</p>
          <p className="text-sm mt-2 max-w-md mx-auto">
            Monthly audit candidate lists will appear here once the sampling engine has
            executed at least one batch run for the upcoming period.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
