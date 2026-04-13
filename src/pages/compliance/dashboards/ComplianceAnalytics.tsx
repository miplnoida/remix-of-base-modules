import { PageHeader } from '@/components/shared/PageHeader';
import { ComplianceKPICards } from '@/components/compliance/analytics/ComplianceKPICards';
import { ViolationTrendChart } from '@/components/compliance/analytics/ViolationTrendChart';
import { RiskDistributionChart } from '@/components/compliance/analytics/RiskDistributionChart';
import { OfficerPerformanceTable } from '@/components/compliance/analytics/OfficerPerformanceTable';
import { ComplianceExport } from '@/components/compliance/analytics/ComplianceExport';
import { ArrangementHealthWidget } from '@/components/compliance/ArrangementHealthWidget';

export default function ComplianceAnalytics() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Compliance Analytics"
          subtitle="Enterprise-wide compliance performance and trends"
          breadcrumbs={[
            { label: 'Compliance', href: '/compliance' },
            { label: 'Analytics' },
          ]}
        />
        <ComplianceExport />
      </div>

      <ComplianceKPICards />

      <div className="grid gap-6 lg:grid-cols-2">
        <ViolationTrendChart />
        <RiskDistributionChart />
      </div>

      <OfficerPerformanceTable />

      <ArrangementHealthWidget />
    </div>
  );
}
