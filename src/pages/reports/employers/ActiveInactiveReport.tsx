import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";
import { StatusBadge } from "@/components/shared/StatusBadge";

export default function ActiveInactiveReport() {
  const statusData = [
    { status: "Active", count: 1156, percentage: 93.7 },
    { status: "Inactive", count: 62, percentage: 5.0 },
    { status: "Suspended", count: 16, percentage: 1.3 }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Active vs Inactive Employers"
        subtitle="Status distribution of registered employers"
        breadcrumbs={[
          { label: "Employers", href: "/employers-management/dashboard" },
          { label: "Reports", href: "#" },
          { label: "Active vs Inactive" }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Active Employers"
          value="1,156"
          icon={CheckCircle}
          subtitle="93.7% of total"
          variant="success"
        />
        <MetricCard
          title="Inactive Employers"
          value="62"
          icon={XCircle}
          subtitle="5.0% of total"
          variant="warning"
        />
        <MetricCard
          title="Suspended"
          value="16"
          icon={AlertCircle}
          subtitle="1.3% of total"
          variant="error"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Donut chart placeholder - Employer status distribution</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statusData.map((item) => (
              <div key={item.status} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <StatusBadge status={item.status} />
                  <span className="font-medium">{item.status} Employers</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">{item.count} employers</span>
                  <span className="font-semibold text-primary">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
