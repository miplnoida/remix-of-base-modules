import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, DollarSign, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";

export default function ContributionsVsBenefitsReport() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Contributions vs Benefits Summary"
        subtitle="Comparative analysis of contributions and benefit payments"
        breadcrumbs={[
          { label: "Finance", href: "#" },
          { label: "Reports", href: "#" },
          { label: "Contributions vs Benefits" }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total Contributions"
          value="EC$ 24.5M"
          icon={DollarSign}
          trend={{ value: 8.2, label: "vs last year", isPositive: true }}
          variant="success"
        />
        <MetricCard
          title="Total Benefits Paid"
          value="EC$ 18.2M"
          icon={BarChart3}
          trend={{ value: 5.6, label: "vs last year", isPositive: true }}
          variant="info"
        />
        <MetricCard
          title="Net Position"
          value="EC$ 6.3M"
          icon={TrendingUp}
          subtitle="Surplus"
          variant="default"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contributions vs Benefits Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Line chart placeholder - Contributions vs benefits over time</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Table placeholder - Monthly breakdown of contributions and benefits</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
