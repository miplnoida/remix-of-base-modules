import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, TrendingUp, DollarSign } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";

export default function InvestmentPortfolioReport() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Investment Portfolio Summary"
        subtitle="Overview of investment holdings and performance"
        breadcrumbs={[
          { label: "Finance", href: "#" },
          { label: "Reports", href: "#" },
          { label: "Investment Portfolio" }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Portfolio Value"
          value="EC$ 92.4M"
          icon={DollarSign}
          trend={{ value: 4.8, label: "vs last quarter", isPositive: true }}
          variant="success"
        />
        <MetricCard
          title="Annual Return"
          value="5.2%"
          icon={TrendingUp}
          subtitle="This fiscal year"
          variant="info"
        />
        <MetricCard
          title="Diversification"
          value="7 Types"
          icon={PieChart}
          subtitle="Asset classes"
          variant="default"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portfolio Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Pie chart placeholder - Investment allocation by asset class</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance by Asset Class</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Table placeholder - Returns by asset class</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
