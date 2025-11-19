import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, DollarSign, TrendingDown } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";

export default function OverpaymentsReport() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Overpayments & Recoveries"
        subtitle="Tracking of overpayments and recovery efforts"
        breadcrumbs={[
          { label: "Benefits", href: "#" },
          { label: "Reports", href: "#" },
          { label: "Overpayments" }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total Overpayments"
          value="EC$ 245K"
          icon={AlertTriangle}
          subtitle="Outstanding"
          variant="warning"
        />
        <MetricCard
          title="Recovered YTD"
          value="EC$ 128K"
          icon={DollarSign}
          trend={{ value: 18.4, label: "vs last year", isPositive: true }}
          variant="success"
        />
        <MetricCard
          title="Recovery Rate"
          value="52.2%"
          icon={TrendingDown}
          subtitle="Of overpayments"
          variant="info"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overpayment Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Line chart placeholder - Overpayments and recoveries over time</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outstanding Overpayments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Table placeholder - List of outstanding overpayments</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
