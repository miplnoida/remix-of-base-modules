import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";

export default function CoverageByAgeReport() {
  const ageGroups = [
    { range: "18-25", count: 1200, percentage: 9.6 },
    { range: "26-35", count: 3500, percentage: 28.1 },
    { range: "36-45", count: 4200, percentage: 33.7 },
    { range: "46-55", count: 2800, percentage: 22.5 },
    { range: "56+", count: 750, percentage: 6.0 }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Active Coverage by Age Group"
        subtitle="Distribution of insured persons across age groups"
        breadcrumbs={[
          { label: "Insured Persons", href: "/person/management" },
          { label: "Reports", href: "#" },
          { label: "Coverage by Age" }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          title="Most Common Age Group"
          value="36-45 years"
          icon={Users}
          subtitle="33.7% of total"
          variant="info"
        />
        <MetricCard
          title="Growth Trend"
          value="+12.4%"
          icon={TrendingUp}
          subtitle="Year over year"
          variant="success"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Age Distribution Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Bar chart placeholder - Active coverage by age group</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Age Group Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ageGroups.map((group) => (
              <div key={group.range} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="font-medium">{group.range} years</span>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">{group.count.toLocaleString()} persons</span>
                  <span className="font-semibold text-primary">{group.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
