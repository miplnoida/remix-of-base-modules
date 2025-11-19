import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, TrendingUp, Activity } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";

export default function InsuredPersonsSummaryReport() {
  // Dummy data
  const summaryData = {
    totalInsured: 12450,
    activeContributors: 9800,
    newRegistrations: 245,
    averageAge: 42
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Insured Persons Summary Report"
        subtitle="Comprehensive overview of all insured persons"
        breadcrumbs={[
          { label: "Insured Persons", href: "/person/management" },
          { label: "Reports", href: "#" },
          { label: "Summary Report" }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Insured"
          value={summaryData.totalInsured.toLocaleString()}
          icon={Users}
          trend={{ value: 5.2, label: "vs last month", isPositive: true }}
          variant="default"
        />
        <MetricCard
          title="Active Contributors"
          value={summaryData.activeContributors.toLocaleString()}
          icon={Activity}
          trend={{ value: 3.1, label: "vs last month", isPositive: true }}
          variant="success"
        />
        <MetricCard
          title="New Registrations"
          value={summaryData.newRegistrations.toLocaleString()}
          icon={TrendingUp}
          subtitle="This month"
          variant="info"
        />
        <MetricCard
          title="Average Age"
          value={`${summaryData.averageAge} years`}
          icon={BarChart3}
          variant="default"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Chart placeholder - Insured persons by category</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Table placeholder - Detailed insured persons data</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
