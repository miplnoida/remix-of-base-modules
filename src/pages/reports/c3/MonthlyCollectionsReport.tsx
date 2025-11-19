import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";

export default function MonthlyCollectionsReport() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Monthly C3 Collections Report"
        subtitle="Monthly contribution collections from employers"
        breadcrumbs={[
          { label: "C3 Management", href: "/c3-management/dashboard" },
          { label: "Reports", href: "#" },
          { label: "Monthly Collections" }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="This Month"
          value="EC$ 2.1M"
          icon={DollarSign}
          trend={{ value: 7.8, label: "vs last month", isPositive: true }}
          variant="success"
        />
        <MetricCard
          title="Year to Date"
          value="EC$ 18.4M"
          icon={Calendar}
          trend={{ value: 12.3, label: "vs last year", isPositive: true }}
          variant="info"
        />
        <MetricCard
          title="Collection Rate"
          value="96.5%"
          icon={TrendingUp}
          subtitle="On-time payments"
          variant="default"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Line chart placeholder - Monthly collections over time</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Contributing Employers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Table placeholder - Highest contributing employers</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
