import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Wallet, DollarSign } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";
import { ExportActions } from "@/components/reports/ExportActions";
import { ExportColumn } from "@/utils/exportUtils";

const mockData = [
  { month: 'January', reserves: 125800000, operating: 8400000, ratio: 6.9 },
  { month: 'February', reserves: 126200000, operating: 8500000, ratio: 7.0 },
  { month: 'March', reserves: 125800000, operating: 8400000, ratio: 6.9 },
];

const exportColumns: ExportColumn[] = [
  { header: 'Month', key: 'month', width: 15 },
  { header: 'Reserves (EC$)', key: 'reserves', width: 20 },
  { header: 'Operating Cash (EC$)', key: 'operating', width: 20 },
  { header: 'Reserve Ratio', key: 'ratio', width: 15 },
];

export default function CashFlowReport() {
  return (
    <div className="container mx-auto p-6 space-y-6" id="cash-flow-report">
      <div className="flex justify-between items-start">
        <PageHeader
          title="Cash Flow & Reserves Report"
          subtitle="Analysis of cash flow and reserve balances"
          breadcrumbs={[
            { label: "Finance", href: "#" },
            { label: "Reports", href: "#" },
            { label: "Cash Flow & Reserves" }
          ]}
        />
        <ExportActions
          reportTitle="Cash Flow & Reserves Report"
          fileName="cash-flow-reserves"
          data={mockData}
          columns={exportColumns}
          additionalInfo={[
            { label: 'Report Date', value: new Date().toLocaleDateString() },
            { label: 'Current Reserves', value: 'EC$ 125.8M' },
          ]}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Current Reserves"
          value="EC$ 125.8M"
          icon={Wallet}
          trend={{ value: 3.4, label: "vs last quarter", isPositive: true }}
          variant="success"
        />
        <MetricCard
          title="Operating Cash"
          value="EC$ 8.4M"
          icon={DollarSign}
          subtitle="Available balance"
          variant="info"
        />
        <MetricCard
          title="Reserve Ratio"
          value="6.9x"
          icon={TrendingUp}
          subtitle="Annual benefits"
          variant="default"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Line chart placeholder - Cash flow over time</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reserve Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Pie chart placeholder - Reserve allocation by type</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
