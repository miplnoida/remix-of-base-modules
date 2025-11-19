import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";

export default function EngagementSummaryReport() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Audit Engagement Summary"
        subtitle="Overview of audit engagements"
        breadcrumbs={[
          { label: "Internal Audit", href: "/audit/plans" },
          { label: "Reports", href: "#" },
          { label: "Engagement Summary" }
        ]}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Total Audits" value="42" icon={BarChart3} variant="info" />
        <MetricCard title="Completed" value="38" icon={BarChart3} variant="success" />
        <MetricCard title="In Progress" value="4" icon={BarChart3} variant="default" />
      </div>
      <Card>
        <CardHeader><CardTitle>Audit Status</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Chart placeholder</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
