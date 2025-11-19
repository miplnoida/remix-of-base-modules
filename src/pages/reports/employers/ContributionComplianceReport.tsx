import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";

export default function ContributionComplianceReport() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Employer Contribution Compliance"
        subtitle="Compliance status of employer contributions"
        breadcrumbs={[
          { label: "Employers", href: "/employers-management/dashboard" },
          { label: "Reports", href: "#" },
          { label: "Contribution Compliance" }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Fully Compliant"
          value="1,089"
          icon={CheckCircle}
          subtitle="94.2% on time"
          variant="success"
        />
        <MetricCard
          title="Late Submissions"
          value="51"
          icon={AlertTriangle}
          subtitle="4.4% late"
          variant="warning"
        />
        <MetricCard
          title="Non-Compliant"
          value="16"
          icon={XCircle}
          subtitle="1.4% missing"
          variant="error"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compliance Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Line chart placeholder - Compliance rate over time</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Non-Compliant Employers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Table placeholder - List of non-compliant employers</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
