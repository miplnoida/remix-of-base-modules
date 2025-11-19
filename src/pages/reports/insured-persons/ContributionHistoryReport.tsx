import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";

export default function ContributionHistoryReport() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Contribution History Report"
        subtitle="Historical contribution data by insured person"
        breadcrumbs={[
          { label: "Insured Persons", href: "/person/management" },
          { label: "Reports", href: "#" },
          { label: "Contribution History" }
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
          title="Average per Person"
          value="EC$ 1,968"
          icon={Calendar}
          subtitle="Per year"
          variant="info"
        />
        <MetricCard
          title="Collection Rate"
          value="94.2%"
          icon={TrendingUp}
          trend={{ value: 2.1, label: "vs last quarter", isPositive: true }}
          variant="default"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contribution Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Line chart placeholder - Contribution history over time</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Contributions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Table placeholder - Recent contribution records</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
