import { useState } from "react";
import { BackNavigation } from "@/components/ui/back-navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileDown, TrendingUp, TrendingDown, DollarSign, Scale, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const SAVED_VIEWS = [
  { id: 'last-90', label: 'Last 90 Days' },
  { id: 'ytd', label: 'YTD' },
  { id: 'last-12', label: 'Last 12 Months' }
];

export default function SSBLegalReports() {
  const [activeView, setActiveView] = useState('ytd');

  const handleExport = (format: 'csv' | 'xlsx' | 'pdf') => {
    toast.success(`Exporting report as ${format.toUpperCase()}...`);
  };

  // Mock KPI data
  const kpis = {
    activeCases: 42,
    activeTrend: 8,
    totalOwed: 1250000,
    owedTrend: -3,
    collected: 450000,
    collectedRate: 36,
    enforcementCases: 15,
    enforcementTrend: 5
  };

  return (
    <div className="min-h-screen bg-background">
      <BackNavigation />
      
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
              <p className="text-sm text-muted-foreground mt-1">Legal performance and recovery metrics</p>
            </div>
            <div className="flex gap-2">
              <Select defaultValue="ytd">
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAVED_VIEWS.map(view => (
                    <SelectItem key={view.id} value={view.id}>{view.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => handleExport('xlsx')}>
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{kpis.activeCases}</div>
                  <div className="flex items-center gap-1 mt-1 text-sm">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">+{kpis.activeTrend}%</span>
                    <span className="text-muted-foreground">vs prev</span>
                  </div>
                </div>
                <Scale className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Owed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">
                    ${(kpis.totalOwed / 1000000).toFixed(2)}M
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-sm">
                    <TrendingDown className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">{kpis.owedTrend}%</span>
                    <span className="text-muted-foreground">vs prev</span>
                  </div>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Collection Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{kpis.collectedRate}%</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    ${(kpis.collected / 1000).toFixed(0)}K collected
                  </div>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Enforcement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{kpis.enforcementCases}</div>
                  <div className="flex items-center gap-1 mt-1 text-sm">
                    <TrendingUp className="h-3 w-3 text-amber-600" />
                    <span className="text-amber-600">+{kpis.enforcementTrend}%</span>
                    <span className="text-muted-foreground">vs prev</span>
                  </div>
                </div>
                <AlertCircle className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Case Volume by Type</CardTitle>
              <CardDescription>Distribution of active cases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ChartRow label="Employer Arrears" value={25} total={42} color="bg-blue-600" />
                <ChartRow label="Overpayment Recovery" value={8} total={42} color="bg-green-600" />
                <ChartRow label="Insured Appeal" value={5} total={42} color="bg-purple-600" />
                <ChartRow label="Compliance/Recovery" value={4} total={42} color="bg-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Arrears & Recovery</CardTitle>
              <CardDescription>YTD financial performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Owed</span>
                    <span className="font-semibold">${(kpis.totalOwed / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full">
                    <div className="h-full bg-red-600 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Collected</span>
                    <span className="font-semibold text-green-600">${(kpis.collected / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full">
                    <div className="h-full bg-green-600 rounded-full" style={{ width: `${kpis.collectedRate}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Outstanding</span>
                    <span className="font-semibold text-amber-600">
                      ${((kpis.totalOwed - kpis.collected) / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full">
                    <div className="h-full bg-amber-600 rounded-full" style={{ width: `${100 - kpis.collectedRate}%` }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enforcement Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Enforcement Funnel</CardTitle>
            <CardDescription>Monthly progression through enforcement stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <FunnelStage label="Summons Issued" count={28} color="bg-blue-600" />
              <FunnelStage label="Judgment Summons" count={15} color="bg-purple-600" />
              <FunnelStage label="Warrant" count={8} color="bg-amber-600" />
              <FunnelStage label="Writ" count={3} color="bg-red-600" />
            </div>
          </CardContent>
        </Card>

        {/* Arrangement Compliance */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Payment Arrangements</CardTitle>
              <CardDescription>Compliance with payment plans</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ChartRow label="On-time" value={12} total={18} color="bg-green-600" />
                <ChartRow label="Defaulted" value={6} total={18} color="bg-red-600" />
              </div>
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium">Waivers (5K Penalty Only)</div>
                <div className="text-2xl font-bold mt-1">$47,500</div>
                <div className="text-xs text-muted-foreground">Total waived YTD (19 cases)</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workload by Officer</CardTitle>
              <CardDescription>Active case distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ChartRow label="Maria Rodriguez" value={15} total={42} color="bg-blue-600" />
                <ChartRow label="Carlos Martinez" value={12} total={42} color="bg-green-600" />
                <ChartRow label="Sarah Johnson" value={10} total={42} color="bg-purple-600" />
                <ChartRow label="Unassigned" value={5} total={42} color="bg-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ChartRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = (value / total) * 100;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-2 bg-muted rounded-full">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function FunnelStage({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`${color} text-white rounded-lg p-6 mb-2`}>
        <div className="text-3xl font-bold">{count}</div>
      </div>
      <div className="text-sm font-medium">{label}</div>
    </div>
  );
}
