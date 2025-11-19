import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, DollarSign, Building2 } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";

export default function ArrearsReport() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Contribution Arrears Report"
        subtitle="Outstanding contribution payments from employers"
        breadcrumbs={[
          { label: "C3 Management", href: "/c3-management/dashboard" },
          { label: "Reports", href: "#" },
          { label: "Arrears" }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total Arrears"
          value="EC$ 385K"
          icon={DollarSign}
          trend={{ value: 2.4, label: "vs last month", isPositive: false }}
          variant="error"
        />
        <MetricCard
          title="Employers in Arrears"
          value="67"
          icon={Building2}
          subtitle="5.4% of total"
          variant="warning"
        />
        <MetricCard
          title="Average Arrears"
          value="EC$ 5,746"
          icon={AlertTriangle}
          subtitle="Per employer"
          variant="default"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Arrears by Age</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Bar chart placeholder - Arrears by aging period</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employers in Arrears</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Table placeholder - List of employers with outstanding payments</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
