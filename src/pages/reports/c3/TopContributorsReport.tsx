import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Award, Building2 } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";

export default function TopContributorsReport() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Top Contributors Report"
        subtitle="Highest contributing employers by volume"
        breadcrumbs={[
          { label: "C3 Management", href: "/c3-management/dashboard" },
          { label: "Reports", href: "#" },
          { label: "Top Contributors" }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Top Contributor"
          value="EC$ 145K"
          icon={Award}
          subtitle="This month"
          variant="success"
        />
        <MetricCard
          title="Top 10 Total"
          value="EC$ 980K"
          icon={TrendingUp}
          subtitle="46.7% of collections"
          variant="info"
        />
        <MetricCard
          title="Average Top 10"
          value="EC$ 98K"
          icon={Building2}
          subtitle="Per employer"
          variant="default"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 10 Contributors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Bar chart placeholder - Top 10 employers by contribution</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Contributors List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Table placeholder - Detailed list of top contributors</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
