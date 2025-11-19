import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Heart, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";

export default function PaymentsByTypeReport() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Benefit Payments by Type"
        subtitle="Distribution of benefit payments across categories"
        breadcrumbs={[
          { label: "Benefits", href: "#" },
          { label: "Reports", href: "#" },
          { label: "Payments by Type" }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total Paid"
          value="EC$ 18.2M"
          icon={DollarSign}
          trend={{ value: 5.6, label: "vs last year", isPositive: true }}
          variant="success"
        />
        <MetricCard
          title="Total Recipients"
          value="2,845"
          icon={Heart}
          subtitle="Active beneficiaries"
          variant="info"
        />
        <MetricCard
          title="Average Payment"
          value="EC$ 6,398"
          icon={TrendingUp}
          subtitle="Per recipient"
          variant="default"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Distribution by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Bar chart placeholder - Payments by benefit type</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Payment Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Line chart placeholder - Monthly payment trends</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
