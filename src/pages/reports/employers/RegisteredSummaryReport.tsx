import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, TrendingUp, Activity } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";

export default function RegisteredSummaryReport() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Registered Employers Summary"
        subtitle="Overview of all registered employers"
        breadcrumbs={[
          { label: "Employers", href: "/employers-management/dashboard" },
          { label: "Reports", href: "#" },
          { label: "Registered Summary" }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Employers"
          value="1,234"
          icon={Building2}
          trend={{ value: 4.5, label: "vs last month", isPositive: true }}
          variant="default"
        />
        <MetricCard
          title="Active Employers"
          value="1,156"
          icon={Activity}
          subtitle="93.7% of total"
          variant="success"
        />
        <MetricCard
          title="Total Employees"
          value="12,450"
          icon={Users}
          trend={{ value: 6.2, label: "vs last month", isPositive: true }}
          variant="info"
        />
        <MetricCard
          title="New This Month"
          value="28"
          icon={TrendingUp}
          variant="default"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registration Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Chart placeholder - Employer registrations over time</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employer Breakdown by Industry</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Pie chart placeholder - Employers by industry sector</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
