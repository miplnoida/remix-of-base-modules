import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, FileText, CheckCircle } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";

export default function ClaimsVolumeReport() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Claims Volume & Processing Time"
        subtitle="Analysis of claim volumes and processing efficiency"
        breadcrumbs={[
          { label: "Benefits", href: "#" },
          { label: "Reports", href: "#" },
          { label: "Claims Volume" }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Claims This Month"
          value="342"
          icon={FileText}
          trend={{ value: 8.2, label: "vs last month", isPositive: true }}
          variant="info"
        />
        <MetricCard
          title="Avg Processing Time"
          value="12 days"
          icon={Clock}
          trend={{ value: 15.3, label: "improvement", isPositive: true }}
          variant="success"
        />
        <MetricCard
          title="Approval Rate"
          value="87.3%"
          icon={CheckCircle}
          subtitle="Of submitted claims"
          variant="default"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Claims Volume Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Line chart placeholder - Claims volume over time</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Processing Time Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Histogram placeholder - Distribution of processing times</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
